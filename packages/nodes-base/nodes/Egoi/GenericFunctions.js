import { NodeApiError } from 'n8n-workflow';
const fieldCache = {};
export async function egoiApiRequest(method, endpoint, body = {}, qs = {}, _headers) {
    const credentials = await this.getCredentials('egoiApi');
    const options = {
        headers: {
            accept: 'application/json',
            Apikey: `${credentials.apiKey}`,
        },
        method,
        qs,
        body,
        url: `https://api.egoiapp.com${endpoint}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function getFields(listId) {
    if (fieldCache[listId]) {
        return fieldCache[listId];
    }
    fieldCache[listId] = await egoiApiRequest.call(this, 'GET', `/lists/${listId}/fields`);
    return fieldCache[listId];
}
export async function egoiApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.offset = 0;
    query.count = 500;
    do {
        responseData = await egoiApiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        query.offset += query.count;
    } while (responseData[propertyName] && responseData[propertyName].length !== 0);
    return returnData;
}
export async function simplify(contacts, listId) {
    let fields = await getFields.call(this, listId);
    fields = fields.filter((element) => element.type === 'extra');
    const fieldsKeyValue = {};
    for (const field of fields) {
        fieldsKeyValue[field.field_id] = field.name;
    }
    const data = [];
    for (const contact of contacts) {
        const extras = contact.extra.reduce((accumulator, currentValue) => {
            const key = fieldsKeyValue[currentValue.field_id];
            return { [key]: currentValue.value, ...accumulator };
        }, {});
        data.push({
            ...contact.base,
            ...extras,
            tags: contact.tags,
        });
    }
    return data;
}
//# sourceMappingURL=GenericFunctions.js.map