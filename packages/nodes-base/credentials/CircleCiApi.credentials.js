export class CircleCiApi {
    name = 'circleCiApi';
    displayName = 'CircleCI API';
    documentationUrl = 'circleci';
    properties = [
        {
            displayName: 'Personal API Token',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=CircleCiApi.credentials.js.map