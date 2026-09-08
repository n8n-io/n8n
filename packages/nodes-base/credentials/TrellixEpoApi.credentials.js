export class TrellixEpoApi {
    name = 'trellixEpoApi';
    displayName = 'Trellix (McAfee) ePolicy Orchestrator API';
    documentationUrl = 'trellixepo';
    icon = 'file:icons/Trellix.svg';
    httpRequestNode = {
        name: 'Trellix (McAfee) ePolicy Orchestrator',
        docsUrl: 'https://docs.trellix.com/en/bundle/epolicy-orchestrator-web-api-reference-guide',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.username}}',
                password: '={{$credentials.password}}',
            },
        },
    };
}
//# sourceMappingURL=TrellixEpoApi.credentials.js.map