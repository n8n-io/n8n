export class ZoomApi {
    name = 'zoomApi';
    displayName = 'Zoom API';
    documentationUrl = 'zoom';
    properties = [
        {
            displayName: 'On 1 June, 2023 Zoom will remove JWT App support. You will have to connect to Zoom using the Oauth2 auth method. <a target="_blank" href="https://marketplace.zoom.us/docs/guides/build/jwt-app/jwt-faq/">More details (zoom.us)</a>',
            name: 'notice',
            type: 'notice',
            default: '',
        },
        {
            displayName: 'JWT Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.zoom.us/v2',
            url: '/users/me',
        },
    };
}
//# sourceMappingURL=ZoomApi.credentials.js.map