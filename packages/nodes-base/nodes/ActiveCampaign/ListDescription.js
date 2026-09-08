import { activeCampaignDefaultGetAllProperties } from './GenericFunctions';
export const listOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['list'],
            },
        },
        options: [
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Get many lists',
                action: 'Get many lists',
            },
        ],
        default: 'getAll',
    },
];
export const listFields = [
    // ----------------------------------
    //         list:getAll
    // ----------------------------------
    ...activeCampaignDefaultGetAllProperties('list', 'getAll'),
];
//# sourceMappingURL=ListDescription.js.map