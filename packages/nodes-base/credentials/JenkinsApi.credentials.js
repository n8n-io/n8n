export class JenkinsApi {
    name = 'jenkinsApi';
    displayName = 'Jenkins API';
    documentationUrl = 'jenkins';
    properties = [
        {
            displayName: 'Jenkins Username',
            name: 'username',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Personal API Token',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Jenkins Instance URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
        },
    ];
}
//# sourceMappingURL=JenkinsApi.credentials.js.map