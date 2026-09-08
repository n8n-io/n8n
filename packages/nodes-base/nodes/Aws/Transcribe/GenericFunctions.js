import { sign } from 'aws4';
import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
import { URL } from 'url';
import { assertSupportedAwsRegion, assumeRole } from '../../../credentials/common/aws/utils';
import { getAwsCredentials } from '../GenericFunctions';
function getEndpointForService(service, credentials) {
    assertSupportedAwsRegion(credentials.region);
    let endpoint;
    if (service === 'lambda' && credentials.lambdaEndpoint) {
        endpoint = credentials.lambdaEndpoint;
    }
    else if (service === 'sns' && credentials.snsEndpoint) {
        endpoint = credentials.snsEndpoint;
    }
    else {
        endpoint = `https://${service}.${credentials.region}.amazonaws.com`;
    }
    return endpoint.replace('{region}', credentials.region);
}
export async function awsApiRequest(service, method, path, body, headers) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    // Concatenate path and instantiate URL object so it parses correctly query strings
    const endpoint = new URL(getEndpointForService(service, credentials) + path);
    // Sign AWS API request with the resolved credentials
    const signOpts = { headers: headers || {}, host: endpoint.host, method, path, body };
    try {
        let securityHeaders;
        if (credentialsType === 'awsAssumeRole') {
            const assumeRoleCredentials = credentials;
            securityHeaders = await assumeRole(assumeRoleCredentials, assumeRoleCredentials.region);
        }
        else {
            const iamCredentials = credentials;
            securityHeaders = {
                accessKeyId: `${iamCredentials.accessKeyId}`.trim(),
                secretAccessKey: `${iamCredentials.secretAccessKey}`.trim(),
                sessionToken: iamCredentials.temporaryCredentials
                    ? `${iamCredentials.sessionToken}`.trim()
                    : undefined,
            };
        }
        sign(signOpts, securityHeaders);
        const options = {
            headers: signOpts.headers,
            method,
            uri: endpoint.href,
            body: signOpts.body,
        };
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error); // no XML parsing needed
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
export async function awsApiRequestRESTAllItems(propertyName, service, method, path, body, query = {}, _headers = {}, _option = {}, _region) {
    const returnData = [];
    let responseData;
    const propertyNameArray = propertyName.split('.');
    do {
        responseData = await awsApiRequestREST.call(this, service, method, path, body, query);
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