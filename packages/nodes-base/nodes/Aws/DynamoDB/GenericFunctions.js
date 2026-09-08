import { OperationalError, UserError } from 'n8n-workflow';
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
        return JSON.parse((await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions)));
    }
    catch (error) {
        const statusCode = (error.statusCode || error.cause?.statusCode);
        let errorMessage = error.response?.body?.message || error.response?.body?.Message || error.message;
        if (statusCode === 403) {
            if (errorMessage === 'The security token included in the request is invalid.') {
                throw new UserError('The AWS credentials are not valid!', { level: 'warning' });
            }
            else if (errorMessage.startsWith('The request signature we calculated does not match the signature you provided')) {
                throw new UserError('The AWS credentials are not valid!', { level: 'warning' });
            }
        }
        if (error.cause?.error) {
            try {
                errorMessage = JSON.parse(error.cause?.error).message;
            }
            catch (ex) { }
        }
        throw new OperationalError(`AWS error response [${statusCode}]: ${errorMessage}`, {
            level: 'warning',
        });
    }
}
export async function awsApiRequestAllItems(service, method, path, body, headers) {
    const returnData = [];
    let responseData;
    do {
        const originalHeaders = Object.assign({}, headers); //The awsapirequest function adds the hmac signature to the headers, if we pass the modified headers back in on the next call it will fail with invalid signature
        responseData = await awsApiRequest.call(this, service, method, path, body, originalHeaders);
        if (responseData.LastEvaluatedKey) {
            body.ExclusiveStartKey = responseData.LastEvaluatedKey;
        }
        returnData.push(...responseData.Items);
    } while (responseData.LastEvaluatedKey !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map