"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BVQApi = void 0;
class BVQApi {
    constructor() {
        this.name = 'bvqApi';
        this.displayName = 'BVQ API';
        this.icon = {
            light: 'file:bvq.png',
            dark: 'file:bvq.png',
        };
        this.documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
        this.properties = [
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                default: '',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                default: '',
                typeOptions: {
                    password: true,
                },
            },
            {
                displayName: 'API Base URL',
                name: 'apiBaseURL',
                type: 'string',
                default: '',
            },
            {
                displayName: 'Ignore SSL issues',
                name: 'ignoreSslIssues',
                type: 'boolean',
                default: false,
                description: 'Accept self-signed or invalid SSL certificates (unsafe)',
            }
        ];
        this.test = {
            request: {
                skipSslCertificateValidation: '={{$credentials.ignoreSslIssues}}',
                method: 'GET',
                url: '={{ $credentials.apiBaseURL.endsWith("/") ? $credentials.apiBaseURL + "me" : $credentials.apiBaseURL + "/me" }}',
                auth: {
                    username: '={{ $credentials.username }}',
                    password: '={{ $credentials.password }}',
                },
            },
        };
    }
}
exports.BVQApi = BVQApi;
//# sourceMappingURL=BVQApi.credentials.js.map