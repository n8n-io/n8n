export class AffinityApi {
    name = 'affinityApi';
    displayName = 'Affinity API';
    documentationUrl = 'affinity';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=AffinityApi.credentials.js.map