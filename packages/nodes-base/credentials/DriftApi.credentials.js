export class DriftApi {
    name = 'driftApi';
    displayName = 'Drift API';
    documentationUrl = 'drift';
    properties = [
        {
            displayName: 'Personal Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Visit your account details page, and grab the Access Token. See <a href="https://devdocs.drift.com/docs/quick-start">Drift auth</a>.',
        },
    ];
}
//# sourceMappingURL=DriftApi.credentials.js.map