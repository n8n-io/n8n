export class PagerDutyApi {
    name = 'pagerDutyApi';
    displayName = 'PagerDuty API';
    documentationUrl = 'pagerduty';
    properties = [
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=PagerDutyApi.credentials.js.map