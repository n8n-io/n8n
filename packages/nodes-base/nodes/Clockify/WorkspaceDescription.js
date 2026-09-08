export const workspaceOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['workspace'],
            },
        },
        options: [
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Get many workspaces',
                action: 'Get many workspaces',
            },
        ],
        default: 'getAll',
    },
];
export const workspaceFields = [
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
            show: {
                operation: ['getAll'],
                resource: ['workspace'],
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
                resource: ['workspace'],
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
//# sourceMappingURL=WorkspaceDescription.js.map