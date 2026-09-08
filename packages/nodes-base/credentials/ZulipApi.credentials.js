export class ZulipApi {
    name = 'zulipApi';
    displayName = 'Zulip API';
    documentationUrl = 'zulip';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://yourZulipDomain.zulipchat.com',
        },
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
            resolvableField: true,
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            resolvableField: true,
        },
    ];
}
//# sourceMappingURL=ZulipApi.credentials.js.map