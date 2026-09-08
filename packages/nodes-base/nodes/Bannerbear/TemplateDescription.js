export const templateOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['template'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get a template',
                action: 'Get a template',
            },
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Get many templates',
                action: 'Get many templates',
            },
        ],
        default: 'get',
    },
];
export const templateFields = [
    /* -------------------------------------------------------------------------- */
    /*                                 template:get                               */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Template ID',
        name: 'templateId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                resource: ['template'],
                operation: ['get'],
            },
        },
        description: 'Unique identifier for the template',
    },
];
//# sourceMappingURL=TemplateDescription.js.map