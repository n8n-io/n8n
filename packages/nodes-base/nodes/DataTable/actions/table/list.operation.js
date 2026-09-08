import { ROWS_LIMIT_DEFAULT } from '../../common/constants';
import { getDataTableAggregateProxy } from '../../common/utils';
export const FIELD = 'list';
const displayOptions = {
    show: {
        resource: ['table'],
        operation: [FIELD],
    },
};
export const description = [
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        default: true,
        description: 'Whether to return all results or only up to a given limit',
        displayOptions,
    },
    {
        displayName: 'Limit Per Input Row',
        name: 'limit',
        type: 'number',
        default: ROWS_LIMIT_DEFAULT,
        description: 'Max number of results to return',
        typeOptions: {
            minValue: 1,
        },
        displayOptions: {
            show: {
                ...displayOptions.show,
                returnAll: [false],
            },
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions,
        options: [
            {
                displayName: 'Filter by Name',
                name: 'filterName',
                type: 'string',
                default: '',
                description: 'Filter data tables by name (case-insensitive)',
            },
            {
                displayName: 'Sort Field',
                name: 'sortField',
                type: 'options',
                default: 'name',
                options: [
                    { name: 'Created', value: 'createdAt' },
                    { name: 'Name', value: 'name' },
                    { name: 'Updated', value: 'updatedAt' },
                ],
                description: 'Field to sort by',
            },
            {
                displayName: 'Sort Direction',
                name: 'sortDirection',
                type: 'options',
                default: 'asc',
                options: [
                    { name: 'Ascending', value: 'asc' },
                    { name: 'Descending', value: 'desc' },
                ],
            },
        ],
    },
];
export async function execute(index) {
    const returnAll = this.getNodeParameter('returnAll', index);
    const limit = this.getNodeParameter('limit', index, ROWS_LIMIT_DEFAULT);
    const options = this.getNodeParameter('options', index, {});
    const aggregateProxy = await getDataTableAggregateProxy(this);
    const queryOptions = {};
    if (options.sortField && options.sortDirection) {
        queryOptions.sortBy =
            `${options.sortField}:${options.sortDirection}`;
    }
    if (options.filterName) {
        queryOptions.filter = { name: options.filterName.toLowerCase() };
    }
    const results = [];
    if (returnAll) {
        let skip = 0;
        const take = 100;
        let hasMore = true;
        while (hasMore) {
            const response = await aggregateProxy.getManyAndCount({
                ...queryOptions,
                skip,
                take,
            });
            for (const table of response.data) {
                results.push({ json: table });
            }
            skip += take;
            hasMore = response.data.length === take && results.length < response.count;
        }
    }
    else {
        const response = await aggregateProxy.getManyAndCount({
            ...queryOptions,
            skip: 0,
            take: limit,
        });
        for (const table of response.data) {
            results.push({ json: table });
        }
    }
    return results;
}
//# sourceMappingURL=list.operation.js.map