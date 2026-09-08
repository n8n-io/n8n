export class SecurityScorecardApi {
    name = 'securityScorecardApi';
    displayName = 'SecurityScorecard API';
    documentationUrl = 'securityscorecard';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
    ];
}
//# sourceMappingURL=SecurityScorecardApi.credentials.js.map