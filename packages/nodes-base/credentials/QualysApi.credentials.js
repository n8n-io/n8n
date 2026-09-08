export class QualysApi {
    name = 'qualysApi';
    displayName = 'Qualys API';
    icon = 'file:icons/Qualys.svg';
    documentationUrl = 'qualys';
    httpRequestNode = {
        name: 'Qualys',
        docsUrl: 'https://qualysguard.qg2.apps.qualys.com/qwebhelp/fo_portal/api_doc/index.htm',
        apiBaseUrl: 'https://qualysapi.qualys.com/api/',
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
        {
            displayName: 'Requested With',
            name: 'requestedWith',
            type: 'string',
            default: 'n8n application',
            description: 'User description, like a user agent',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Requested-With': '={{$credentials.requestedWith}}',
            },
            auth: {
                username: '={{$credentials.username}}',
                password: '={{$credentials.password}}',
            },
        },
    };
}
//# sourceMappingURL=QualysApi.credentials.js.map