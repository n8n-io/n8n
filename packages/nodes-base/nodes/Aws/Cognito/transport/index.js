import { getAwsCredentials } from '../../GenericFunctions';
export async function awsApiRequest(method, action, body) {
    const { credentials, credentialsType } = await getAwsCredentials(this);
    const requestOptions = {
        url: '',
        method,
        body,
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
        },
        qs: {
            service: 'cognito-idp',
            _region: credentials.region,
        },
    };
    return await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, requestOptions);
}
export async function awsApiRequestAllItems(method, action, body, propertyName) {
    const returnData = [];
    let nextToken;
    do {
        const requestBody = {
            ...body,
            ...(nextToken ? { NextToken: nextToken } : {}),
        };
        const response = (await awsApiRequest.call(this, method, action, JSON.stringify(requestBody)));
        const items = (response[propertyName] ?? []);
        returnData.push(...items);
        nextToken = response.NextToken;
    } while (nextToken);
    return returnData;
}
//# sourceMappingURL=index.js.map