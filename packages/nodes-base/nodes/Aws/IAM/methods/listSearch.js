import { NodeApiError } from 'n8n-workflow';
import { CURRENT_VERSION } from '../helpers/constants';
import { awsApiRequest } from '../transport';
function formatSearchResults(items, propertyName, filter) {
    return items
        .map((item) => ({
        name: String(item[propertyName] ?? ''),
        value: String(item[propertyName] ?? ''),
    }))
        .filter(({ name }) => !filter || name.includes(filter))
        .sort((a, b) => a.name.localeCompare(b.name));
}
export async function searchUsers(filter, paginationToken) {
    const options = {
        method: 'POST',
        url: '',
        body: {
            Action: 'ListUsers',
            Version: CURRENT_VERSION,
            ...(paginationToken ? { Marker: paginationToken } : {}),
        },
    };
    const responseData = (await awsApiRequest.call(this, options));
    const users = responseData.ListUsersResponse.ListUsersResult.Users || [];
    const nextMarker = responseData.ListUsersResponse.ListUsersResult.IsTruncated
        ? responseData.ListUsersResponse.ListUsersResult.Marker
        : undefined;
    return {
        results: formatSearchResults(users, 'UserName', filter),
        paginationToken: nextMarker,
    };
}
export async function searchGroups(filter, paginationToken) {
    const options = {
        method: 'POST',
        url: '',
        body: {
            Action: 'ListGroups',
            Version: CURRENT_VERSION,
            ...(paginationToken ? { Marker: paginationToken } : {}),
        },
    };
    const responseData = (await awsApiRequest.call(this, options));
    const groups = responseData.ListGroupsResponse.ListGroupsResult.Groups || [];
    const nextMarker = responseData.ListGroupsResponse.ListGroupsResult.IsTruncated
        ? responseData.ListGroupsResponse.ListGroupsResult.Marker
        : undefined;
    return {
        results: formatSearchResults(groups, 'GroupName', filter),
        paginationToken: nextMarker,
    };
}
export async function searchGroupsForUser(filter) {
    const userName = this.getNodeParameter('user', undefined, { extractValue: true });
    let allGroups = [];
    let nextMarkerGroups;
    do {
        const options = {
            method: 'POST',
            url: '',
            body: {
                Action: 'ListGroups',
                Version: CURRENT_VERSION,
                ...(nextMarkerGroups ? { Marker: nextMarkerGroups } : {}),
            },
        };
        const groupsData = (await awsApiRequest.call(this, options));
        const groups = groupsData.ListGroupsResponse?.ListGroupsResult?.Groups || [];
        nextMarkerGroups = groupsData.ListGroupsResponse?.ListGroupsResult?.IsTruncated
            ? groupsData.ListGroupsResponse?.ListGroupsResult?.Marker
            : undefined;
        allGroups = [...allGroups, ...groups];
    } while (nextMarkerGroups);
    if (allGroups.length === 0) {
        return { results: [] };
    }
    const groupCheckPromises = allGroups.map(async (group) => {
        const groupName = group.GroupName;
        if (!groupName) {
            return null;
        }
        try {
            const options = {
                method: 'POST',
                url: '',
                body: {
                    Action: 'GetGroup',
                    Version: CURRENT_VERSION,
                    GroupName: groupName,
                },
            };
            const getGroupResponse = (await awsApiRequest.call(this, options));
            const groupResult = getGroupResponse?.GetGroupResponse?.GetGroupResult;
            const userExists = groupResult?.Users?.some((user) => user.UserName === userName);
            if (userExists) {
                return { UserName: userName, GroupName: groupName };
            }
        }
        catch (error) {
            throw new NodeApiError(this.getNode(), error, {
                message: `Failed to get group ${groupName}: ${error?.message ?? 'Unknown error'}`,
            });
        }
        return null;
    });
    const validUserGroups = (await Promise.all(groupCheckPromises)).filter(Boolean);
    return {
        results: formatSearchResults(validUserGroups, 'GroupName', filter),
    };
}
//# sourceMappingURL=listSearch.js.map