export class OpenWeatherMapApi {
    name = 'openWeatherMapApi';
    displayName = 'OpenWeatherMap API';
    documentationUrl = 'openweathermap';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            qs: {
                appid: '={{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.openweathermap.org/data/2.5',
            url: '/weather',
            qs: {
                q: 'London',
            },
        },
    };
}
//# sourceMappingURL=OpenWeatherMapApi.credentials.js.map