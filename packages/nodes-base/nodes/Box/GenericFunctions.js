import { NodeApiError } from 'n8n-workflow';
export async function boxApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://api.box.com/2.0${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        const oAuth2Options = {
            includeCredentialsOnRefreshOnBody: true,
        };
        return await this.helpers.requestOAuth2.call(this, 'boxOAuth2Api', options, oAuth2Options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function boxApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 100;
    query.offset = 0;
    do {
        responseData = await boxApiRequest.call(this, method, endpoint, body, query);
        query.offset = responseData.offset + query.limit;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData[propertyName].length !== 0);
    return returnData;
}
export async function boxApiRequestAllItemsMarker(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 100;
    do {
        responseData = await boxApiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        query.next_marker = responseData.next_marker;
    } while (responseData.next_marker);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map