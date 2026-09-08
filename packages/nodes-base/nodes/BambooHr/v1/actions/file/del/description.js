export const fileDelDescription = [
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                operation: ['delete'],
                resource: ['file'],
            },
        },
        default: '',
        description: 'ID of the file',
    },
];
//# sourceMappingURL=description.js.map