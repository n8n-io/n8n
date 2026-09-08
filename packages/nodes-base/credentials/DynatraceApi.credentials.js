export class DynatraceApi {
    name = 'dynatraceApi';
    displayName = 'Dynatrace API';
    documentationUrl = 'dynatrace';
    icon = { light: 'file:icons/Dynatrace.svg', dark: 'file:icons/Dynatrace.svg' };
    httpRequestNode = {
        name: 'Dynatrace',
        docsUrl: 'https://docs.dynatrace.com/docs/dynatrace-api',
        apiBaseUrlPlaceholder: 'https://{your-environment-id}.live.dynatrace.com/api/v2/events',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Api-Token {{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=DynatraceApi.credentials.js.map