export class FileMaker {
    name = 'fileMaker';
    displayName = 'FileMaker API';
    documentationUrl = 'filemaker';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Database',
            name: 'db',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Login',
            name: 'login',
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
//# sourceMappingURL=FileMaker.credentials.js.map