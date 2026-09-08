export class AcuitySchedulingApi {
    name = 'acuitySchedulingApi';
    displayName = 'Acuity Scheduling API';
    documentationUrl = 'acuityscheduling';
    properties = [
        {
            displayName: 'User ID',
            name: 'userId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=AcuitySchedulingApi.credentials.js.map