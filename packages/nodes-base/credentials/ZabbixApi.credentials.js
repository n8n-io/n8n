export class ZabbixApi {
    name = 'zabbixApi';
    displayName = 'Zabbix API';
    documentationUrl = 'zabbix';
    icon = 'file:icons/Zabbix.svg';
    httpRequestNode = {
        name: 'Zabbix',
        docsUrl: 'https://www.zabbix.com/documentation/current/en/manual/api',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            required: true,
            type: 'string',
            default: '',
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
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
                Authorization: '=Bearer {{$credentials.apiToken}}',
                'Content-Type': 'application/json-rpc',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
            url: '/api_jsonrpc.php',
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                method: 'host.get',
                params: {
                    output: ['hostid', 'host'],
                    selectInterfaces: ['interfaceid', 'ip'],
                },
                id: 2,
            },
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'result',
                    value: undefined,
                    message: 'Invalid access token',
                },
            },
        ],
    };
}
//# sourceMappingURL=ZabbixApi.credentials.js.map