import * as query from './query.operation';
import { siteRLC } from '../common';
export { query };
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['search'],
            },
        },
        options: [
            {
                name: 'Query',
                value: 'query',
                description: 'Search content with a CQL query',
                action: 'Perform a query',
            },
        ],
        default: 'query',
    },
    {
        ...siteRLC,
        displayOptions: {
            show: {
                resource: ['search'],
            },
        },
    },
    ...query.description,
];
//# sourceMappingURL=index.js.map