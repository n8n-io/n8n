export const employeeDocumentDelDescription = [
    {
        displayName: 'Employee ID',
        name: 'employeeId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                operation: ['delete'],
                resource: ['employeeDocument'],
            },
        },
        default: '',
        description: 'ID of the employee',
    },
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                operation: ['delete'],
                resource: ['employeeDocument'],
            },
        },
        default: '',
        description: 'ID of the employee file',
    },
];
//# sourceMappingURL=description.js.map