import get from 'lodash/get';
import { NodeApiError, sanitizeXmlName } from 'n8n-workflow';
import { parseString } from 'xml2js';
import { getAwsCredentials } from '../GenericFunctions';
export async function awsApiRequest(service, method, path, body, headers) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    const requestOptions = {
        qs: {
            service,
            path,
        },
        method,
        body: JSON.stringify(body),
        url: '',
        headers,
        region: credentials?.region,
    };
    try {
        return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error, { parseXml: true });
    }
}
export async function awsApiRequestREST(service, method, path, body, headers) {
    const response = await awsApiRequest.call(this, service, method, path, body, headers);
    try {
        return JSON.parse(response);
    }
    catch (error) {
        return response;
    }
}
export async function awsApiRequestSOAP(service, method, path, body, headers) {
    const response = await awsApiRequest.call(this, service, method, path, body, headers);
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
    catch (error) {
        return response;
    }
}
export async function awsApiRequestSOAPAllItems(propertyName, service, method, path, body, query = {}, _headers = {}, _option = {}, _region) {
    const returnData = [];
    let responseData;
    const propertyNameArray = propertyName.split('.');
    do {
        responseData = await awsApiRequestSOAP.call(this, service, method, path, body, query);
        if (get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextToken'])) {
            query.NextToken = get(responseData, [
                propertyNameArray[0],
                propertyNameArray[1],
                'NextToken',
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
    } while (get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextToken']) !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map