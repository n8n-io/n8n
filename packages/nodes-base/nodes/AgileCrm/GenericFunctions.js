import { NodeApiError } from 'n8n-workflow';
export async function agileCrmApiRequest(method, endpoint, body = {}, query = {}, uri, sendAsForm) {
    const credentials = await this.getCredentials('agileCrmApi');
    const options = {
        method,
        headers: {
            Accept: 'application/json',
        },
        auth: {
            username: credentials.email,
            password: credentials.apiKey,
        },
        qs: query,
        uri: uri || `https://${credentials.subdomain}.agilecrm.com/dev/${endpoint}`,
        json: true,
    };
    // To send the request as 'content-type': 'application/x-www-form-urlencoded' add form to options instead of body
    if (sendAsForm) {
        options.form = body;
    }
    // Only add Body property if method not GET or DELETE to avoid 400 response
    // And when not sending a form
    else if (method !== 'GET' && method !== 'DELETE') {
        options.body = body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function agileCrmApiRequestAllItems(method, resource, body = {}, query = {}, uri, sendAsForm) {
    // https://github.com/agilecrm/rest-api#11-listing-contacts-
    const returnData = [];
    let responseData;
    do {
        responseData = await agileCrmApiRequest.call(this, method, resource, body, query, uri, sendAsForm);
        if (responseData.length !== 0) {
            returnData.push.apply(returnData, responseData);
            if (sendAsForm) {
                body.cursor = responseData[responseData.length - 1].cursor;
            }
            else {
                query.cursor = responseData[responseData.length - 1].cursor;
            }
        }
    } while (responseData.length !== 0 &&
        responseData[responseData.length - 1].hasOwnProperty('cursor'));
    return returnData;
}
export async function agileCrmApiRequestUpdate(method = 'PUT', _endpoint, body = {}, _query = {}, uri) {
    const credentials = await this.getCredentials('agileCrmApi');
    const baseUri = `https://${credentials.subdomain}.agilecrm.com/dev/`;
    const options = {
        method,
        headers: {
            Accept: 'application/json',
        },
        body: { id: body.id },
        auth: {
            username: credentials.email,
            password: credentials.apiKey,
        },
        uri: uri || baseUri,
        json: true,
    };
    const successfulUpdates = [];
    let lastSuccesfulUpdateReturn;
    const payload = body;
    try {
        // Due to API, we must update each property separately. For user it looks like one seamless update
        if (payload.properties) {
            options.body.properties = payload.properties;
            options.uri = baseUri + 'api/contacts/edit-properties';
            lastSuccesfulUpdateReturn = await this.helpers.request(options);
            // Iterate trough properties and show them as individial updates instead of only vague "properties"
            payload.properties?.map((property) => {
                successfulUpdates.push(`${property.name}`);
            });
            delete options.body.properties;
        }
        if (payload.lead_score) {
            options.body.lead_score = payload.lead_score;
            options.uri = baseUri + 'api/contacts/edit/lead-score';
            lastSuccesfulUpdateReturn = await this.helpers.request(options);
            successfulUpdates.push('lead_score');
            delete options.body.lead_score;
        }
        if (body.tags) {
            options.body.tags = payload.tags;
            options.uri = baseUri + 'api/contacts/edit/tags';
            lastSuccesfulUpdateReturn = await this.helpers.request(options);
            payload.tags?.map((tag) => {
                successfulUpdates.push(`(Tag) ${tag}`);
            });
            delete options.body.tags;
        }
        if (body.star_value) {
            options.body.star_value = payload.star_value;
            options.uri = baseUri + 'api/contacts/edit/add-star';
            lastSuccesfulUpdateReturn = await this.helpers.request(options);
            successfulUpdates.push('star_value');
            delete options.body.star_value;
        }
        return lastSuccesfulUpdateReturn;
    }
    catch (error) {
        if (successfulUpdates.length === 0) {
            throw new NodeApiError(this.getNode(), error);
        }
        else {
            throw new NodeApiError(this.getNode(), error, {
                message: `Not all properties updated. Updated properties: ${successfulUpdates.join(', ')}`,
                description: error.message,
                httpCode: error.statusCode,
            });
        }
    }
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
export function getFilterRules(conditions, matchType) {
    const rules = [];
    // eslint-disable-next-line @typescript-eslint/no-for-in-array
    for (const key in conditions) {
        if (conditions.hasOwnProperty(key)) {
            const searchConditions = conditions[key];
            const rule = {
                LHS: searchConditions.field,
                CONDITION: searchConditions.condition_type,
                RHS: searchConditions.value,
                RHS_NEW: searchConditions.value2,
            };
            rules.push(rule);
        }
    }
    if (matchType === 'anyFilter') {
        return {
            or_rules: rules,
        };
    }
    else {
        return {
            rules,
        };
    }
}
export function simplifyResponse(records) {
    const results = [];
    for (const record of records) {
        results.push(record.properties.reduce((obj, value) => Object.assign(obj, { [`${value.name}`]: value.value }), { id: record.id }));
    }
    return results;
}
//# sourceMappingURL=GenericFunctions.js.map