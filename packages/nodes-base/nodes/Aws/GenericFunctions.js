import { NodeApiError, sanitizeXmlName } from 'n8n-workflow';
import { parseString as parseXml } from 'xml2js';
export async function getAwsCredentials(context) {
    let credentialsType = 'aws';
    try {
        const authentication = context.getNodeParameter('authentication', 0);
        if (authentication === 'assumeRole') {
            credentialsType = 'awsAssumeRole';
        }
    }
    catch (error) {
        context.logger.warn('Could not get authentication type');
    }
    const credentials = await context.getCredentials(credentialsType);
    return { credentials, credentialsType };
}
export async function awsApiRequest(service, method, path, body, headers) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    const requestOptions = {
        qs: {
            service,
            path,
        },
        method,
        body: service === 'lambda' ? body : JSON.stringify(body),
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
            parseXml(response, {
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