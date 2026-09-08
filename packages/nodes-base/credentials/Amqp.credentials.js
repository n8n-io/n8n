export class Amqp {
    name = 'amqp';
    displayName = 'AMQP';
    documentationUrl = 'amqp';
    properties = [
        {
            displayName: 'Hostname',
            name: 'hostname',
            type: 'string',
            placeholder: 'e.g. localhost',
            default: '',
        },
        {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 5672,
        },
        {
            displayName: 'User',
            name: 'username',
            type: 'string',
            placeholder: 'e.g. guest',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            placeholder: 'e.g. guest',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Transport Type',
            name: 'transportType',
            type: 'string',
            placeholder: 'e.g. tcp',
            default: '',
            hint: 'Optional transport type to use, either tcp or tls',
        },
    ];
}
//# sourceMappingURL=Amqp.credentials.js.map