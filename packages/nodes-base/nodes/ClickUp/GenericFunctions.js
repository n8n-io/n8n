import { NodeApiError } from 'n8n-workflow';
export async function clickupApiRequest(method, resource, body = {}, qs = {}, uri, _option = {}) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `https://api.clickup.com/api/v2${resource}`,
        json: true,
    };
    try {
        const authenticationMethod = this.getNodeParameter('authentication', 0);
        if (authenticationMethod === 'accessToken') {
            return await this.helpers.requestWithAuthentication.call(this, 'clickUpApi', options);
        }
        else {
            const oAuth2Options = {
                keepBearer: false,
                tokenType: 'Bearer',
                // ClickUp's access token doesn't expire and
                // ClickUp does not return refresh tokens
                skipTokenRefresh: true,
            };
            return await this.helpers.requestOAuth2.call(this, 'clickUpOAuth2Api', options, oAuth2Options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function clickupApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 0;
    do {
        responseData = await clickupApiRequest.call(this, method, resource, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        query.page++;
        const limit = query.limit;
        if (limit && limit <= returnData.length) {
            return returnData;
        }
    } while (responseData[propertyName] && responseData[propertyName].length !== 0);
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map