import get from 'lodash/get';
/**
 * Make an API request to Asana
 *
 */
export async function asanaApiRequest(method, endpoint, body, query, uri) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {},
        method,
        body: method === 'GET' || method === 'HEAD' || method === 'DELETE' ? null : { data: body },
        qs: query,
        url: uri || `https://app.asana.com/api/1.0${endpoint}`,
        json: true,
    };
    if (options.body === null) {
        delete options.body;
    }
    const credentialType = authenticationMethod === 'accessToken' ? 'asanaApi' : 'asanaOAuth2Api';
    return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}
export async function asanaApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.limit = 100;
    do {
        responseData = await asanaApiRequest.call(this, method, endpoint, body, query, uri);
        uri = get(responseData, 'next_page.uri');
        query = {}; // query is not needed once we have next_page.uri
        returnData.push.apply(returnData, responseData.data);
    } while (responseData.next_page !== null);
    return returnData;
}
export async function getWorkspaces() {
    const endpoint = '/workspaces';
    const responseData = await asanaApiRequestAllItems.call(this, 'GET', endpoint, {});
    const returnData = [];
    for (const workspaceData of responseData) {
        if (workspaceData.resource_type !== 'workspace') {
            // Not sure if for some reason also ever other resources
            // get returned but just in case filter them out
            continue;
        }
        returnData.push({
            name: workspaceData.name,
            value: workspaceData.gid,
        });
    }
    returnData.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    return returnData;
}
export function getColorOptions() {
    return [
        'dark-blue',
        'dark-brown',
        'dark-green',
        'dark-orange',
        'dark-pink',
        'dark-purple',
        'dark-red',
        'dark-teal',
        'dark-warm-gray',
        'light-blue',
        'light-green',
        'light-orange',
        'light-pink',
        'light-purple',
        'light-red',
        'light-teal',
        'light-warm-gray',
        'light-yellow',
        'none',
    ].map((value) => {
        return {
            name: value,
            value,
        };
    });
}
export function getTaskFields() {
    return [
        '*',
        'GID',
        'Resource Type',
        'name',
        'Approval Status',
        'Assignee Status',
        'Completed',
        'Completed At',
        'Completed By',
        'Created At',
        'Dependencies',
        'Dependents',
        'Due At',
        'Due On',
        'External',
        'HTML Notes',
        'Liked',
        'Likes',
        'Memberships',
        'Modified At',
        'Notes',
        'Num Likes',
        'Resource Subtype',
        'Start On',
        'Assignee',
        'Custom Fields',
        'Followers',
        'Parent',
        'Permalink URL',
        'Projects',
        'Tags',
        'Workspace',
    ];
}
//# sourceMappingURL=GenericFunctions.js.map