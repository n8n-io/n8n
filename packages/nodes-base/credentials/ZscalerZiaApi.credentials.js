import { UserError } from 'n8n-workflow';
export class ZscalerZiaApi {
    name = 'zscalerZiaApi';
    displayName = 'Zscaler ZIA API';
    documentationUrl = 'zscalerzia';
    icon = 'file:icons/Zscaler.svg';
    httpRequestNode = {
        name: 'Zscaler ZIA',
        docsUrl: 'https://help.zscaler.com/zia/getting-started-zia-api',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'Cookie',
            name: 'cookie',
            type: 'hidden',
            typeOptions: {
                expirable: true,
            },
            default: '',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            placeholder: 'e.g. zsapi.zscalerthree.net',
            required: true,
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
        {
            displayName: 'Api Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
    ];
    async preAuthentication(credentials) {
        const { baseUrl, username, password, apiKey } = credentials;
        const url = baseUrl.endsWith('/')
            ? baseUrl.slice(0, -1)
            : baseUrl;
        const now = Date.now().toString();
        const obfuscate = (key, timestamp) => {
            const high = timestamp.substring(timestamp.length - 6);
            let low = (parseInt(high) >> 1).toString();
            let obfuscatedApiKey = '';
            while (low.length < 6) {
                low = '0' + low;
            }
            for (let i = 0; i < high.length; i++) {
                obfuscatedApiKey += key.charAt(parseInt(high.charAt(i)));
            }
            for (let j = 0; j < low.length; j++) {
                obfuscatedApiKey += key.charAt(parseInt(low.charAt(j)) + 2);
            }
            return obfuscatedApiKey;
        };
        const response = await this.helpers.httpRequest({
            method: 'POST',
            baseURL: `https://${url}`,
            url: '/api/v1/authenticatedSession',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
            body: {
                apiKey: obfuscate(apiKey, now),
                username,
                password,
                timestamp: now,
            },
            returnFullResponse: true,
        });
        const headers = response.headers;
        const cookie = headers['set-cookie']
            ?.find((entrt) => entrt.includes('JSESSIONID'))
            ?.split(';')
            ?.find((entry) => entry.includes('JSESSIONID'));
        if (!cookie) {
            throw new UserError('No cookie returned. Please check your credentials.', {
                level: 'warning',
            });
        }
        return { cookie };
    }
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Cookie: '={{$credentials.cookie}}',
            },
        },
    };
    test = {
        request: {
            url: '=https://{{$credentials.baseUrl}}/api/v1/authSettings/exemptedUrls',
        },
    };
}
//# sourceMappingURL=ZscalerZiaApi.credentials.js.map