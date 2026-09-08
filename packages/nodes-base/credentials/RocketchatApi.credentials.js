export class RocketchatApi {
    name = 'rocketchatApi';
    displayName = 'Rocket API';
    documentationUrl = 'rocketchat';
    properties = [
        {
            displayName: 'User ID',
            name: 'userId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Auth Key',
            name: 'authKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'https://n8n.rocket.chat',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Auth-Token': '={{$credentials.authKey}}',
                'X-User-Id': '={{$credentials.userId}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.domain}}',
            url: '/api/v1/webdav.getMyAccounts',
        },
    };
}
//# sourceMappingURL=RocketchatApi.credentials.js.map