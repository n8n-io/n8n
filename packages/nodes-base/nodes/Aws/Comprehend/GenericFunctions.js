import { sanitizeXmlName } from 'n8n-workflow';
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
        body,
        url: '',
        headers,
        region: credentials?.region,
    };
    return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
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
//# sourceMappingURL=GenericFunctions.js.map