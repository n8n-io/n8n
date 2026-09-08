export class NextCloudApi {
    name = 'nextCloudApi';
    displayName = 'NextCloud API';
    documentationUrl = 'nextcloud';
    properties = [
        {
            displayName: 'Web DAV URL',
            name: 'webDavUrl',
            type: 'string',
            placeholder: 'https://nextcloud.example.com/remote.php/webdav',
            default: '',
        },
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.auth = {
            username: credentials.user,
            password: credentials.password,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: "={{$credentials.webDavUrl.replace('/remote.php/webdav', '')}}",
            url: '/ocs/v1.php/cloud/capabilities',
            headers: { 'OCS-APIRequest': true },
        },
    };
}
//# sourceMappingURL=NextCloudApi.credentials.js.map