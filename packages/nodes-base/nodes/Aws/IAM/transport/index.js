import { NodeApiError } from 'n8n-workflow';
import { getAwsCredentials } from '../../GenericFunctions';
import { BASE_URL } from '../helpers/constants';
const errorMapping = {
    403: 'The AWS credentials are not valid!',
};
export async function awsApiRequest(opts) {
    const requestOptions = {
        baseURL: BASE_URL,
        json: true,
        ...opts,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(opts.headers ?? {}),
        },
    };
    if (opts.body) {
        requestOptions.body = new URLSearchParams(opts.body).toString();
    }
    try {
        const { credentialsType } = await getAwsCredentials(this);
        const response = (await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions));
        return response;
    }
    catch (error) {
        const statusCode = (error?.statusCode || error?.cause?.statusCode);
        if (statusCode && errorMapping[statusCode]) {
            throw new NodeApiError(this.getNode(), {
                message: `AWS error response [${statusCode}]: ${errorMapping[statusCode]}`,
            });
        }
        else {
            throw new NodeApiError(this.getNode(), error);
        }
    }
}
//# sourceMappingURL=index.js.map