import { getUrl } from './common/http';
export class ConvertKitApi {
    name = 'convertKitApi';
    displayName = 'ConvertKit API';
    documentationUrl = 'convertkit';
    properties = [
        {
            displayName: 'API Secret',
            name: 'apiSecret',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
    ];
    async authenticate(credentials, options) {
        const url = getUrl(options);
        const secret = {
            api_secret: credentials.apiSecret,
        };
        // it's a webhook so include the api secret on the body
        if (url?.includes('/automations/hooks')) {
            options.body = options.body || {};
            if (typeof options.body === 'object') {
                Object.assign(options.body, secret);
            }
        }
        else {
            options.qs = options.qs || {};
            if (typeof options.qs === 'object') {
                Object.assign(options.qs, secret);
            }
        }
        return options;
    }
    test = {
        request: {
            url: 'https://api.convertkit.com/v3/account',
        },
    };
}
//# sourceMappingURL=ConvertKitApi.credentials.js.map