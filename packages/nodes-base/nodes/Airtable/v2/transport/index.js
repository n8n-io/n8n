import { UserError } from 'n8n-workflow';
/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(method, endpoint, body = {}, query, uri, option = {}) {
    query = query || {};
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
    if (typeof fieldNames === 'string') {
        fieldNames = fieldNames.split(',').map((item) => item.trim());
    }
    if (!fieldNames.length) {
        throw new UserError("Specify field to download in 'Download Attachments' option", {
            level: 'warning',
        });
    }
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
export async function batchUpdate(endpoint, body, updateRecords) {
    if (!updateRecords.length) {
        return { records: [] };
    }
    let responseData;
    if (updateRecords.length && updateRecords.length <= 10) {
        const updateBody = {
            ...body,
            records: updateRecords,
        };
        responseData = await apiRequest.call(this, 'PATCH', endpoint, updateBody);
        return responseData;
    }
    const batchSize = 10;
    const batches = Math.ceil(updateRecords.length / batchSize);
    const updatedRecords = [];
    for (let j = 0; j < batches; j++) {
        const batch = updateRecords.slice(j * batchSize, (j + 1) * batchSize);
        const updateBody = {
            ...body,
            records: batch,
        };
        const updateResponse = await apiRequest.call(this, 'PATCH', endpoint, updateBody);
        updatedRecords.push(...(updateResponse.records || []));
    }
    responseData = { records: updatedRecords };
    return responseData;
}
//# sourceMappingURL=index.js.map