export class CockpitApi {
    name = 'cockpitApi';
    displayName = 'Cockpit API';
    documentationUrl = 'cockpit';
    properties = [
        {
            displayName: 'Cockpit URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://example.com',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=CockpitApi.credentials.js.map