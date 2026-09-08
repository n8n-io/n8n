export class SegmentApi {
    name = 'segmentApi';
    displayName = 'Segment API';
    documentationUrl = 'segment';
    properties = [
        {
            displayName: 'Write Key',
            name: 'writekey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        const base64Key = Buffer.from(`${credentials.writekey}:`).toString('base64');
        requestOptions.headers.Authorization = `Basic ${base64Key}`;
        return requestOptions;
    }
}
//# sourceMappingURL=SegmentApi.credentials.js.map