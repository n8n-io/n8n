/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(method, endpoint, body, query, uri, option = {}) {
    query = query || {};
    // For some reason for some endpoints the bearer auth does not work
    // and it returns 404 like for the /meta request. So we always send
    // it as query string.
    // query.api_key = credentials.apiKey;
    const options = {
        headers: {},
        method,
        body,
        qs: query,
        uri: uri || `https://api.airtable.com/v0/${endpoint}`,
        useQuerystring: false,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
}
/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @param {(IExecuteFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(method, endpoint, body, query) {
    if (query === undefined) {
        query = {};
    }
    query.pageSize = 100;
    const returnData = [];
    let responseData;
    do {
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData.records);
        query.offset = responseData.offset;
    } while (responseData.offset !== undefined);
    return {
        records: returnData,
    };
}
export async function downloadRecordAttachments(records, fieldNames, pairedItem) {
    const elements = [];
    for (const record of records) {
        const element = { json: {}, binary: {} };
        if (pairedItem) {
            element.pairedItem = pairedItem;
        }
        element.json = record;
        for (const fieldName of fieldNames) {
            if (record.fields[fieldName] !== undefined) {
                for (const [index, attachment] of record.fields[fieldName].entries()) {
                    const file = await apiRequest.call(this, 'GET', '', {}, {}, attachment.url, {
                        json: false,
                        encoding: null,
                    });
                    element.binary[`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(Buffer.from(file), attachment.filename, attachment.type);
                }
            }
        }
        if (Object.keys(element.binary).length === 0) {
            delete element.binary;
        }
        elements.push(element);
    }
    return elements;
}
//# sourceMappingURL=GenericFunctions.js.map