import { formatPemBlock } from '@n8n/utils/format-pem-block';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import { OperationalError } from 'n8n-workflow';
import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';
export class SalesforceJwtApi {
    name = 'salesforceJwtApi';
    displayName = 'Salesforce JWT API';
    documentationUrl = 'salesforce';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'hidden',
            typeOptions: {
                expirable: true,
            },
            default: '',
        },
        {
            displayName: 'Instance URL',
            name: 'instanceUrl',
            type: 'hidden',
            default: '',
        },
        {
            displayName: 'Environment Type',
            name: 'environment',
            type: 'options',
            options: [
                {
                    name: 'Production',
                    value: 'production',
                },
                {
                    name: 'Sandbox',
                    value: 'sandbox',
                },
            ],
            default: 'production',
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            default: '',
            required: true,
            description: 'Consumer Key from Salesforce Connected App',
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Private Key',
            name: 'privateKey',
            type: 'string',
            typeOptions: {
                password: true,
                rows: 4,
            },
            default: '',
            required: true,
            description: 'Use the multiline editor. Make sure it is in standard PEM key format:<br />-----BEGIN PRIVATE KEY-----<br />KEY DATA GOES HERE<br />-----END PRIVATE KEY-----',
        },
        {
            displayName: 'My Domain URL',
            name: 'myDomainUrl',
            type: 'string',
            default: '',
            placeholder: 'https://mycompany.my.salesforce.com',
            description: "Your org's My Domain URL (e.g. <code>https://mycompany.my.salesforce.com</code>). Required for Spring '26 and later orgs; leave blank to keep the default audience used by earlier orgs.",
        },
    ];
    // Only called when "accessToken" (the expirable property) is empty or expired.
    // Exchanges the signed JWT for an access token once and caches it (together with
    // the instance URL) so chained Salesforce actions reuse the same session instead
    // of logging in on every request.
    async preAuthentication(credentials) {
        const now = moment().unix();
        const authUrl = resolveAuthUrl(credentials);
        const privateKey = formatPemBlock(credentials.privateKey);
        const signature = jwt.sign({
            iss: credentials.clientId,
            sub: credentials.username,
            aud: authUrl,
            exp: now + 3 * 60,
        }, privateKey, {
            algorithm: 'RS256',
            header: {
                alg: 'RS256',
            },
        });
        // `myDomainUrl` is a free-form credential string, so gate the token POST on SSRF protection.
        const http = getTokenRequestClient('user-controlled');
        const response = (await http.request({
            url: `${authUrl}/services/oauth2/token`,
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: signature,
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            json: true,
            timeout: TOKEN_REQUEST_TIMEOUT,
        }));
        if (!response.access_token || !response.instance_url) {
            throw new OperationalError('Salesforce JWT authentication did not return an access token and instance URL');
        }
        return { accessToken: response.access_token, instanceUrl: response.instance_url };
    }
    async authenticate(credentials, requestOptions) {
        requestOptions.headers = {
            ...requestOptions.headers,
            Authorization: `Bearer ${credentials.accessToken}`,
        };
        // Node requests pass a relative URL and rely on the cached instance URL as base.
        // The credential test supplies its own baseURL (the login/My Domain URL), which
        // must be left untouched.
        if (!requestOptions.baseURL && credentials.instanceUrl) {
            requestOptions.baseURL = credentials.instanceUrl;
        }
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '={{$credentials?.myDomainUrl ? $credentials.myDomainUrl.replace(/\\/$/, "") : ($credentials?.environment === "sandbox" ? "https://test.salesforce.com" : "https://login.salesforce.com")}}',
            url: '/services/oauth2/userinfo',
            method: 'GET',
        },
    };
}
export function resolveAuthUrl(credentials) {
    const myDomainUrl = (credentials.myDomainUrl ?? '').replace(/\/$/, '');
    if (myDomainUrl) {
        return myDomainUrl;
    }
    return credentials.environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com';
}
//# sourceMappingURL=SalesforceJwtApi.credentials.js.map