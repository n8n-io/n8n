export class MistApi {
    name = 'mistApi';
    displayName = 'Mist API';
    icon = 'file:icons/Mist.svg';
    documentationUrl = 'mist';
    httpRequestNode = {
        name: 'Mist',
        docsUrl: 'https://www.mist.com/documentation/mist-api-introduction/',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'API Token',
            name: 'token',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
        {
            displayName: 'Region',
            name: 'region',
            type: 'options',
            options: [
                {
                    name: 'Europe',
                    value: 'eu',
                },
                {
                    name: 'Global',
                    value: 'global',
                },
            ],
            default: 'eu',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Token {{$credentials.token}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://api{{$credentials.region === "eu" ? ".eu" : ""}}.mist.com',
            url: '/api/v1/self',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=MistApi.credentials.js.map