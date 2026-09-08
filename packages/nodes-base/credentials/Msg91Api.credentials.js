export class Msg91Api {
    name = 'msg91Api';
    displayName = 'Msg91 Api';
    documentationUrl = 'msg91';
    properties = [
        // User authentication key
        {
            displayName: 'Authentication Key',
            name: 'authkey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=Msg91Api.credentials.js.map