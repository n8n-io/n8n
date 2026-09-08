import get from 'lodash/get';
import { sanitizeXmlName } from 'n8n-workflow';
import { parseString } from 'xml2js';
import { getAwsCredentials } from '../../GenericFunctions';
export async function awsApiRequest(service, method, path, body, query = {}, headers, option = {}, _region) {
    const requestOptions = {
        qs: {
            ...query,
            service,
            path,
            query,
            _region,
        },
        method,
        body,
        url: '',
        headers,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(requestOptions, option);
    }
    const { credentialsType } = await getAwsCredentials(this);
    return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
}
export async function awsApiRequestREST(service, method, path, body, query = {}, headers, options = {}, region) {
    const response = await awsApiRequest.call(this, service, method, path, body, query, headers, options, region);
    try {
        if (response.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
            return await new Promise((resolve, reject) => {
                parseString(response, {
                    explicitArray: false,
                    tagNameProcessors: [sanitizeXmlName],
                    attrNameProcessors: [sanitizeXmlName],
                }, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            });
        }
        return JSON.parse(response);
    }
    catch (error) {
        return response;
    }
}
export async function awsApiRequestRESTAllItems(propertyName, service, method, path, body, query = {}, headers, option = {}, region) {
    const returnData = [];
    let responseData;
    do {
        responseData = await awsApiRequestREST.call(this, service, method, path, body, query, headers, option, region);
        //https://forums.aws.amazon.com/thread.jspa?threadID=55746
        if (get(responseData, [propertyName.split('.')[0], 'NextContinuationToken'])) {
            query['continuation-token'] = get(responseData, [
                propertyName.split('.')[0],
                'NextContinuationToken',
            ]);
        }
        if (get(responseData, propertyName)) {
            if (Array.isArray(get(responseData, propertyName))) {
                returnData.push.apply(returnData, get(responseData, propertyName));
            }
            else {
                returnData.push(get(responseData, propertyName));
            }
        }
        const limit = query.limit;
        if (limit && limit <= returnData.length) {
            return returnData;
        }
    } while (get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== undefined &&
        get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== 'false');
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map