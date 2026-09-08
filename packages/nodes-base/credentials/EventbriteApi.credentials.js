export class EventbriteApi {
    name = 'eventbriteApi';
    displayName = 'Eventbrite API';
    documentationUrl = 'eventbrite';
    properties = [
        {
            displayName: 'Private Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=EventbriteApi.credentials.js.map