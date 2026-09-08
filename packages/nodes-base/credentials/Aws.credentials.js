import { awsCredentialsTest, awsGetSignInOptionsAndUpdateRequest, signOptions, } from './common/aws/utils';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';
export class Aws {
    name = 'aws';
    displayName = 'AWS (IAM)';
    documentationUrl = 'aws';
    icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' };
    properties = [
        awsRegionProperty,
        {
            displayName: 'Access Key ID',
            name: 'accessKeyId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Secret Access Key',
            name: 'secretAccessKey',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
        {
            displayName: 'Temporary Security Credentials',
            name: 'temporaryCredentials',
            description: 'Support for temporary credentials from AWS STS',
            type: 'boolean',
            default: false,
        },
        {
            displayName: 'Session Token',
            name: 'sessionToken',
            type: 'string',
            displayOptions: {
                show: {
                    temporaryCredentials: [true],
                },
            },
            default: '',
            typeOptions: {
                password: true,
            },
        },
        ...awsCustomEndpoints,
    ];
    async authenticate(rawCredentials, requestOptions) {
        const credentials = rawCredentials;
        const service = requestOptions.qs?.service;
        const path = requestOptions.qs?.path ?? '';
        const method = requestOptions.method;
        let region = credentials.region;
        if (requestOptions.qs?._region) {
            region = requestOptions.qs._region;
            delete requestOptions.qs._region;
        }
        const { signOpts, url } = awsGetSignInOptionsAndUpdateRequest(requestOptions, credentials, path, method, service, region);
        const securityHeaders = {
            accessKeyId: `${credentials.accessKeyId}`.trim(),
            secretAccessKey: `${credentials.secretAccessKey}`.trim(),
            sessionToken: credentials.temporaryCredentials
                ? `${credentials.sessionToken}`.trim()
                : undefined,
        };
        return await signOptions(requestOptions, signOpts, securityHeaders, url, method);
    }
    test = awsCredentialsTest;
}
//# sourceMappingURL=Aws.credentials.js.map