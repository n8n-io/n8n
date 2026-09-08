export class BitbucketApi {
    name = 'bitbucketApi';
    displayName = 'Bitbucket API';
    documentationUrl = 'bitbucket';
    properties = [
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
        },
        {
            displayName: 'App Password',
            name: 'appPassword',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=BitbucketApi.credentials.js.map