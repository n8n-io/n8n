import get from 'lodash/get';
import { NodeApiError, sanitizeXmlName } from 'n8n-workflow';
import { parseString } from 'xml2js';
import { getAwsCredentials } from '../GenericFunctions';
export async function awsApiRequest(service, method, path, body, query = {}, headers, _option = {}, _region) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    const requestOptions = {
        qs: {
            ...query,
            service,
            path,
        },
        headers,
        method,
        url: '',
        body,
        region: credentials?.region,
    };
    try {
        return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function awsApiRequestREST(service, method, path, body, query = {}, headers, options = {}, region) {
    const response = await awsApiRequest.call(this, service, method, path, body, query, headers, options, region);
    try {
        return JSON.parse(response);
    }
    catch (e) {
        return response;
    }
}
export async function awsApiRequestSOAP(service, method, path, body, query = {}, headers, option = {}, region) {
    const response = await awsApiRequest.call(this, service, method, path, body, query, headers, option, region);
    try {
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
    catch (e) {
        return e;
    }
}
export async function awsApiRequestSOAPAllItems(propertyName, service, method, path, body, query = {}, headers = {}, option = {}, region) {
    const returnData = [];
    let responseData;
    const propertyNameArray = propertyName.split('.');
    do {
        responseData = await awsApiRequestSOAP.call(this, service, method, path, body, query, headers, option, region);
        if (get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextMarker'])) {
            query.Marker = get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextMarker']);
        }
        if (get(responseData, propertyName)) {
            if (Array.isArray(get(responseData, propertyName))) {
                returnData.push.apply(returnData, get(responseData, propertyName));
            }
            else {
                returnData.push(get(responseData, propertyName));
            }
        }
    } while (get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextMarker']) !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map