import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';
export class CiscoSecureEndpointApi {
    name = 'ciscoSecureEndpointApi';
    displayName = 'Cisco Secure Endpoint (AMP) API';
    documentationUrl = 'ciscosecureendpoint';
    icon = { light: 'file:icons/Cisco.svg', dark: 'file:icons/Cisco.dark.svg' };
    httpRequestNode = {
        name: 'Cisco Secure Endpoint',
        docsUrl: 'https://developer.cisco.com/docs/secure-endpoint/',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'Region',
            name: 'region',
            type: 'options',
            options: [
                {
                    name: 'Asia Pacific, Japan, and China',
                    value: 'apjc.amp',
                },
                {
                    name: 'Europe',
                    value: 'eu.amp',
                },
                {
                    name: 'North America',
                    value: 'amp',
                },
            ],
            default: 'amp',
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
    ];
    async authenticate(credentials, requestOptions) {
        const clientId = credentials.clientId;
        const clientSecret = credentials.clientSecret;
        const region = credentials.region;
        // `region` is interpolated into the request host, so gate the token POSTs on SSRF protection.
        const http = getTokenRequestClient('user-controlled');
        const secureXToken = (await http.request({
            url: `https://visibility.${region}.cisco.com/iroh/oauth2/token`,
            method: 'POST',
            auth: {
                username: clientId,
                password: clientSecret,
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            json: true,
            timeout: TOKEN_REQUEST_TIMEOUT,
        }));
        const secureEndpointToken = (await http.request({
            url: `https://api.${region}.cisco.com/v3/access_tokens`,
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                Authorization: `Bearer ${secureXToken.access_token}`,
            },
            json: true,
            timeout: TOKEN_REQUEST_TIMEOUT,
        }));
        const requestOptionsWithAuth = {
            ...requestOptions,
            headers: {
                ...requestOptions.headers,
                Authorization: `Bearer ${secureEndpointToken.access_token}`,
            },
        };
        return requestOptionsWithAuth;
    }
    test = {
        request: {
            baseURL: '=https://api.{{$credentials.region}}.cisco.com',
            url: '/v3/organizations',
            qs: {
                size: 10,
            },
        },
    };
}
//# sourceMappingURL=CiscoSecureEndpointApi.credentials.js.map