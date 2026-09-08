import { UserError } from 'n8n-workflow';
const BEEMINDER_URI = 'https://www.beeminder.com/api/v1';
function isValidAuthenticationMethod(value) {
    return typeof value === 'string' && ['apiToken', 'oAuth2'].includes(value);
}
export async function beeminderApiRequest(method, endpoint, body = {}, query = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'apiToken');
    if (!isValidAuthenticationMethod(authenticationMethod)) {
        throw new UserError(`Invalid authentication method: ${authenticationMethod}`);
    }
    let credentialType = 'beeminderApi';
    if (authenticationMethod === 'oAuth2') {
        credentialType = 'beeminderOAuth2Api';
    }
    const options = {
        method,
        body,
        qs: query,
        uri: `${BEEMINDER_URI}${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}
export async function beeminderApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    do {
        responseData = await beeminderApiRequest.call(this, method, endpoint, body, query);
        query.page++;
        returnData.push.apply(returnData, responseData);
    } while (responseData.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map