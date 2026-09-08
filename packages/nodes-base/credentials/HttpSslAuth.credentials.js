export class HttpSslAuth {
    name = 'httpSslAuth';
    displayName = 'SSL Certificates';
    documentationUrl = 'httprequest';
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'CA',
            name: 'ca',
            type: 'string',
            description: 'Certificate Authority certificate',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Certificate',
            name: 'cert',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Private Key',
            name: 'key',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Passphrase',
            name: 'passphrase',
            type: 'string',
            description: 'Optional passphrase for the private key, if the private key is encrypted',
            typeOptions: {
                password: true,
            },
            default: '',
        },
    ];
}
//# sourceMappingURL=HttpSslAuth.credentials.js.map