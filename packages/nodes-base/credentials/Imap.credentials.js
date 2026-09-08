export class Imap {
    name = 'imap';
    displayName = 'IMAP';
    documentationUrl = 'imap';
    properties = [
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 993,
        },
        {
            displayName: 'SSL/TLS',
            name: 'secure',
            type: 'boolean',
            default: true,
        },
        {
            displayName: 'Allow Self-Signed Certificates',
            name: 'allowUnauthorizedCerts',
            type: 'boolean',
            description: 'Whether to connect even if SSL certificate validation is not possible',
            default: false,
        },
    ];
}
export function isCredentialsDataImap(candidate) {
    const o = candidate;
    return (o.host !== undefined &&
        o.password !== undefined &&
        o.port !== undefined &&
        o.secure !== undefined &&
        o.user !== undefined);
}
//# sourceMappingURL=Imap.credentials.js.map