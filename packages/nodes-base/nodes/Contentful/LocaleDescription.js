export const resource = {
    name: 'Locale',
    value: 'locale',
};
export const operations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: [resource.value],
            },
        },
        options: [
            {
                name: 'Get Many',
                value: 'getAll',
            },
        ],
        default: 'getAll',
    },
];
export const fields = [
    {
        displayName: 'Environment ID',
        name: 'environmentId',
        type: 'string',
        displayOptions: {
            show: {
                resource: [resource.value],
                operation: ['get', 'getAll'],
            },
        },
        default: 'master',
        description: 'The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".',
    },
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
            show: {
                operation: ['getAll'],
                resource: [resource.value],
            },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
            show: {
                operation: ['getAll'],
                resource: [resource.value],
                returnAll: [false],
            },
        },
        typeOptions: {
            minValue: 1,
            maxValue: 500,
        },
        default: 100,
        description: 'Max number of results to return',
    },
];
//# sourceMappingURL=LocaleDescription.js.map