export class Ftp {
    name = 'ftp';
    displayName = 'FTP';
    documentationUrl = 'ftp';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            required: true,
            type: 'string',
            default: '',
            placeholder: 'localhost',
        },
        {
            displayName: 'Port',
            name: 'port',
            required: true,
            type: 'number',
            default: 21,
        },
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
            typeOptions: {
                password: true,
            },
            default: '',
        },
    ];
}
//# sourceMappingURL=Ftp.credentials.js.map