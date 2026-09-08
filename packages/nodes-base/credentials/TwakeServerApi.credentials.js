export class TwakeServerApi {
    name = 'twakeServerApi';
    displayName = 'Twake Server API';
    icon = 'file:icons/Twake.png';
    documentationUrl = 'twake';
    httpRequestNode = {
        name: 'Twake Server',
        docsUrl: 'https://doc.twake.app/developers-api/home',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'Host URL',
            name: 'hostUrl',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Public ID',
            name: 'publicId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Private API Key',
            name: 'privateApiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=TwakeServerApi.credentials.js.map