// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

import * as Utils from 'utils/utils.jsx';

import GroupRow from 'components/admin_console/group_settings/group_row.jsx';
import NextIcon from 'components/icon/next_icon';
import PreviousIcon from 'components/icon/previous_icon';
import SearchIcon from 'components/svg/search_icon';
import CheckboxCheckedIcon from 'components/svg/checkbox_checked_icon.jsx';

const LDAP_GROUPS_PAGE_SIZE = 200;

export default class GroupsList extends React.PureComponent {
    static propTypes = {
        groups: PropTypes.arrayOf(PropTypes.object),
        total: PropTypes.number,
        actions: PropTypes.shape({
            getLdapGroups: PropTypes.func.isRequired,
            link: PropTypes.func.isRequired,
            unlink: PropTypes.func.isRequired,
        }).isRequired,
    };

    static defaultProps = {
        groups: [],
    };

    constructor(props) {
        super(props);
        this.state = {
            checked: {},
            loading: true,
            page: 0,
            showFilters: false,
            filterIsLinked: false,
            filterIsUnlinked: false,
            filterIsConfigured: false,
            filterIsUnconfigured: false,
            searchString: '',
        };
    }

    componentDidMount() {
        this.props.actions.getLdapGroups(this.state.page, LDAP_GROUPS_PAGE_SIZE).then(() => {
            this.setState({loading: false});
        });
    }

    previousPage = async (e) => {
        e.preventDefault();
        const page = this.state.page < 1 ? 0 : this.state.page - 1;
        this.setState({checked: {}, page, loading: true});
        await this.props.actions.getLdapGroups(page, LDAP_GROUPS_PAGE_SIZE);
        this.setState({loading: false});
    }

    nextPage = async (e) => {
        e.preventDefault();
        const page = this.state.page + 1;
        this.setState({checked: {}, page, loading: true});
        await this.props.actions.getLdapGroups(page, LDAP_GROUPS_PAGE_SIZE);
        this.setState({loading: false});
    }

    onCheckToggle = (key) => {
        const newChecked = {...this.state.checked};
        newChecked[key] = !newChecked[key];
        this.setState({checked: newChecked});
    }

    linkSelectedGroups = () => {
        for (const group of this.props.groups) {
            if (this.state.checked[group.primary_key] && !group.mattermost_group_id) {
                this.props.actions.link(group.primary_key);
            }
        }
    }

    unlinkSelectedGroups = () => {
        for (const group of this.props.groups) {
            if (this.state.checked[group.primary_key] && group.mattermost_group_id) {
                this.props.actions.unlink(group.primary_key);
            }
        }
    }

    selectionActionButtonType = () => {
        let hasSelectedLinked = false;
        for (const group of this.props.groups) {
            if (this.state.checked[group.primary_key]) {
                if (!group.mattermost_group_id) {
                    return 'link';
                }
                hasSelectedLinked = true;
            }
        }
        if (hasSelectedLinked) {
            return 'unlink';
        }

        return 'disabled';
    }

    renderSelectionActionButton = () => {
        switch (this.selectionActionButtonType()) {
        case 'link':
            return (
                <button
                    className='btn btn-primary'
                    onClick={this.linkSelectedGroups}
                >
                    <i className='icon fa fa-link'/>
                    <FormattedMessage
                        id='admin.group_settings.groups_list.link_selected'
                        defaultMessage='Link Selected Groups'
                    />
                </button>
            );
        case 'unlink':
            return (
                <button
                    className='btn btn-primary'
                    onClick={this.unlinkSelectedGroups}
                >
                    <i className='icon fa fa-unlink'/>
                    <FormattedMessage
                        id='admin.group_settings.groups_list.unlink_selected'
                        defaultMessage='Unlink Selected Groups'
                    />
                </button>
            );
        default:
            return (
                <button
                    className='btn btn-inactive disabled'
                >
                    <i className='icon fa fa-link'/>
                    <FormattedMessage
                        id='admin.group_settings.groups_list.link_selected'
                        defaultMessage='Link Selected Groups'
                    />
                </button>
            );
        }
    }

    renderRows = () => {
        if (this.state.loading) {
            return (
                <div className='groups-list-loading'>
                    <i className='fa fa-spinner fa-pulse fa-2x'/>
                </div>
            );
        }
        if (this.props.groups.length === 0) {
            return (
                <div className='groups-list-empty'>
                    <FormattedMessage
                        id='admin.group_settings.groups_list.no_groups_found'
                        defaultMessage='No groups found'
                    />
                </div>
            );
        }
        return this.props.groups.map((item) => {
            return (
                <GroupRow
                    key={item.primary_key}
                    primary_key={item.primary_key}
                    name={item.name}
                    mattermost_group_id={item.mattermost_group_id}
                    has_syncables={item.has_syncables}
                    failed={item.failed}
                    checked={Boolean(this.state.checked[item.primary_key])}
                    onCheckToggle={this.onCheckToggle}
                    actions={{
                        link: this.props.actions.link,
                        unlink: this.props.actions.unlink,
                    }}
                />
            );
        });
    }

    searchGroups = () => {
        this.setState({loading: true, showFilters: false});
        const {searchString, filterIsLinked, filterIsUnlinked, filterIsConfigured, filterIsUnconfigured} = this.state;

        const opts = {q: searchString};
        if (filterIsLinked) {
            opts.isLinked = true;
        }
        if (filterIsUnlinked) {
            opts.isLinked = false;
        }
        if (filterIsConfigured) {
            opts.isConfigured = true;
        }
        if (filterIsUnconfigured) {
            opts.isConfigured = false;
        }

        this.props.actions.getLdapGroups(this.state.page, LDAP_GROUPS_PAGE_SIZE, opts).then(() => {
            this.setState({loading: false});
        });
    }

    clearFilters = () => {
        this.setState({
            filterIsConfigured: false,
            filterIsUnconfigured: false,
            filterIsLinked: false,
            filterIsUnlinked: false,
            showFilters: false,
            searchString: '',
        });
    }

    handleGroupSearchKeyUp = (e) => {
        const {key} = e;
        if (key === 'Enter') {
            this.searchGroups();
        }
    }

    renderSearchFilters = () => {
        return (
            <div className='group-search-filters'>
                <div className='filter-row'>
                    <span
                        className={'filter-check ' + (this.state.filterIsLinked ? 'checked' : '')}
                        onClick={() => this.setState({filterIsLinked: !this.state.filterIsLinked, filterIsUnlinked: false})}
                    >
                        {this.state.filterIsLinked && <CheckboxCheckedIcon/>}
                    </span>
                    <span>
                        <FormattedMessage
                            id='admin.group_settings.filters.isLinked'
                            defaultMessage='Is Linked'
                        />
                    </span>
                </div>
                <div className='filter-row'>
                    <span
                        className={'filter-check ' + (this.state.filterIsUnlinked ? 'checked' : '')}
                        onClick={() => this.setState({filterIsUnlinked: !this.state.filterIsUnlinked, filterIsLinked: false})}
                    >
                        {this.state.filterIsUnlinked && <CheckboxCheckedIcon/>}
                    </span>
                    <span>
                        <FormattedMessage
                            id='admin.group_settings.filters.isUnlinked'
                            defaultMessage='Is Unlinked'
                        />
                    </span>
                </div>
                <div className='filter-row'>
                    <span
                        className={'filter-check ' + (this.state.filterIsConfigured ? 'checked' : '')}
                        onClick={() => this.setState({filterIsConfigured: !this.state.filterIsConfigured, filterIsUnconfigured: false})}
                    >
                        {this.state.filterIsConfigured && <CheckboxCheckedIcon/>}
                    </span>
                    <span>
                        <FormattedMessage
                            id='admin.group_settings.filters.isConfigured'
                            defaultMessage='Is Configured'
                        />
                    </span>
                </div>
                <div className='filter-row'>
                    <span
                        className={'filter-check ' + (this.state.filterIsUnconfigured ? 'checked' : '')}
                        onClick={() => this.setState({filterIsUnconfigured: !this.state.filterIsUnconfigured, filterIsConfigured: false})}
                    >
                        {this.state.filterIsUnconfigured && <CheckboxCheckedIcon/>}
                    </span>
                    <span>
                        <FormattedMessage
                            id='admin.group_settings.filters.isUnconfigured'
                            defaultMessage='Is Unconfigured'
                        />
                    </span>
                </div>
                <a
                    onClick={this.searchGroups}
                    className='btn btn-primary search-groups-btn'
                >
                    <FormattedMessage
                        id='search_bar.search'
                        defaultMessage='Search'
                    />
                </a>
                <button
                    type='button'
                    className='btn btn-link cancel-filters'
                    onClick={this.clearFilters}
                >
                    <FormattedMessage
                        id='add_user_to_channel_modal.cancel'
                        defaultMessage='Cancel'
                    />
                </button>
            </div>
        );
    }

    render = () => {
        const startCount = (this.state.page * LDAP_GROUPS_PAGE_SIZE) + 1;
        let endCount = (this.state.page * LDAP_GROUPS_PAGE_SIZE) + LDAP_GROUPS_PAGE_SIZE;
        const total = this.props.total;
        if (endCount > total) {
            endCount = total;
        }
        const lastPage = endCount === total;
        const firstPage = this.state.page === 0;
        return (
            <div className='groups-list'>
                <div className='groups-list--global-actions'>
                    <div className='group-list-search'>
                        <input
                            type='text'
                            placeholder={Utils.localizeMessage('search_bar.search', 'Search')}
                            onKeyUp={this.handleGroupSearchKeyUp}
                            onChange={(e) => this.setState({searchString: e.target.value})}
                            value={this.state.searchString}
                        />
                        <SearchIcon
                            id='searchIcon'
                            className='search__icon'
                            aria-hidden='true'
                        />
                        <i
                            className={'fa fa-caret-down group-filter-caret ' + (this.state.showFilters ? 'hidden' : '')}
                            onClick={() => this.setState({showFilters: true})}
                        />
                    </div>
                    {this.state.showFilters && this.renderSearchFilters()}
                    <div className='group-list-link-unlink'>
                        {this.renderSelectionActionButton()}
                    </div>
                </div>
                <div className='groups-list--header'>
                    <div className='group-name'>
                        <FormattedMessage
                            id='admin.group_settings.groups_list.nameHeader'
                            defaultMessage='Name'
                        />
                    </div>
                    <div className='group-description'>
                        <FormattedMessage
                            id='admin.group_settings.groups_list.mappingHeader'
                            defaultMessage='Mattermost Linking'
                        />
                    </div>
                    <div className='group-actions'/>
                </div>
                <div className='groups-list--body'>
                    {this.renderRows()}
                </div>
                <div className='groups-list--footer'>
                    <div className='counter'>
                        <FormattedMessage
                            id='admin.group_settings.groups_list.paginatorCount'
                            defaultMessage='{startCount, number} - {endCount, number} of {total, number}'
                            values={{
                                startCount,
                                endCount,
                                total,
                            }}
                        />
                    </div>
                    <button
                        className={'btn btn-link prev ' + (firstPage ? 'disabled' : '')}
                        onClick={firstPage ? null : this.previousPage}
                        disabled={firstPage}
                    >
                        <PreviousIcon/>
                    </button>
                    <button
                        className={'btn btn-link next ' + (lastPage ? 'disabled' : '')}
                        onClick={lastPage ? null : this.nextPage}
                        disabled={lastPage}
                    >
                        <NextIcon/>
                    </button>
                </div>
            </div>
        );
    }
}

