export const resource = {
    name: 'Space',
    value: 'space',
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
                name: 'Get',
                value: 'get',
            },
        ],
        default: 'get',
    },
];
export const fields = [];
//# sourceMappingURL=SpaceDescription.js.map