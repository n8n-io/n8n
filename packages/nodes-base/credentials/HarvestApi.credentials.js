export class HarvestApi {
    name = 'harvestApi';
    displayName = 'Harvest API';
    documentationUrl = 'harvest';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Visit your account details page, and grab the Access Token. See <a href="https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/">Harvest Personal Access Tokens</a>.',
        },
    ];
}
//# sourceMappingURL=HarvestApi.credentials.js.map