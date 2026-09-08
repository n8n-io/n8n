export class CrateDb {
    name = 'crateDb';
    displayName = 'CrateDB';
    documentationUrl = 'cratedb';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: 'localhost',
        },
        {
            displayName: 'Database',
            name: 'database',
            type: 'string',
            default: 'doc',
        },
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: 'crate',
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
            displayName: 'SSL',
            name: 'ssl',
            type: 'options',
            options: [
                {
                    name: 'Allow',
                    value: 'allow',
                },
                {
                    name: 'Disable',
                    value: 'disable',
                },
                {
                    name: 'Require',
                    value: 'require',
                },
            ],
            default: 'disable',
        },
        {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 5432,
        },
    ];
}
//# sourceMappingURL=CrateDb.credentials.js.map