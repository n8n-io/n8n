import get from 'lodash/get';
import { jsonParse, NodeApiError } from 'n8n-workflow';
import { getAwsCredentials } from '../GenericFunctions';
export async function awsApiRequest(service, method, path, body, query = {}, headers) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    const requestOptions = {
        qs: {
            service,
            path,
            ...query,
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
export async function awsApiRequestREST(service, method, path, body, query = {}, headers) {
    const response = await awsApiRequest.call(this, service, method, path, body, query, headers);
    try {
        return JSON.parse(response);
    }
    catch (e) {
        return response;
    }
}
export async function awsApiRequestAllItems(propertyName, service, method, path, body, query = {}, headers = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await awsApiRequestREST.call(this, service, method, path, body, query, headers);
        if (responseData.NextToken) {
            const data = jsonParse(body, {
                errorMessage: 'Response body is not valid JSON',
            });
            data.NextToken = responseData.NextToken;
        }
        returnData.push.apply(returnData, get(responseData, propertyName));
    } while (responseData.NextToken !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map