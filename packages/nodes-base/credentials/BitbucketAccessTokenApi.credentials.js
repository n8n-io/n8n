export class BitbucketAccessTokenApi {
    name = 'bitbucketAccessTokenApi';
    displayName = 'Bitbucket Access Token API';
    documentationUrl = 'bitbucket';
    properties = [
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        const encodedApiKey = Buffer.from(`${credentials.email}:${credentials.accessToken}`).toString('base64');
        if (!requestOptions.headers) {
            requestOptions.headers = {};
        }
        requestOptions.headers.Authorization = `Basic ${encodedApiKey}`;
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.bitbucket.org/2.0',
            url: '/user',
        },
    };
}
//# sourceMappingURL=BitbucketAccessTokenApi.credentials.js.map