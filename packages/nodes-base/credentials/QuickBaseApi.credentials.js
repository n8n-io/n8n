export class QuickBaseApi {
    name = 'quickbaseApi';
    displayName = 'Quick Base API';
    documentationUrl = 'quickbase';
    properties = [
        {
            displayName: 'Hostname',
            name: 'hostname',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'demo.quickbase.com',
        },
        {
            displayName: 'User Token',
            name: 'userToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
    ];
}
//# sourceMappingURL=QuickBaseApi.credentials.js.map