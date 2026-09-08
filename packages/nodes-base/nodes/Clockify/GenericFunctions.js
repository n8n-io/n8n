export async function clockifyApiRequest(method, resource, body = {}, qs = {}, _uri, _option = {}) {
    const BASE_URL = 'https://api.clockify.me/api/v1';
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: `${BASE_URL}/${resource}`,
        json: true,
        useQuerystring: true,
    };
    return await this.helpers.requestWithAuthentication.call(this, 'clockifyApi', options);
}
export async function clockifyApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query['page-size'] = 50;
    query.page = 1;
    do {
        responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData);
        const limit = query.limit;
        if (limit && returnData.length >= limit) {
            return returnData;
        }
        query.page++;
    } while (responseData.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map