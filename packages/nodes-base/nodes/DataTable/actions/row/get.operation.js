import { DATA_TABLE_SYSTEM_COLUMNS, NodeOperationError, } from 'n8n-workflow';
import { ROWS_LIMIT_DEFAULT } from '../../common/constants';
import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'get';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [FIELD],
    },
};
export const description = [
    ...getSelectFields(displayOptions),
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions,
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit Per Input Row',
        name: 'limit',
        type: 'number',
        displayOptions: {
            ...displayOptions,
            show: {
                ...displayOptions.show,
                returnAll: [false],
            },
        },
        typeOptions: {
            minValue: 1,
        },
        default: ROWS_LIMIT_DEFAULT,
        description: 'Max number of results to return',
    },
    {
        displayName: 'Order By',
        name: 'orderBy',
        type: 'boolean',
        displayOptions,
        default: false,
        description: 'Whether to sort the results by a column',
    },
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
        displayName: 'Order By Column',
        name: 'orderByColumn',
        type: 'options',
        // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
        description: 'Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        typeOptions: {
            loadOptionsDependsOn: ['dataTableId.value'],
            loadOptionsMethod: 'getDataTableColumns',
        },
        displayOptions: {
            ...displayOptions,
            show: {
                ...displayOptions.show,
                orderBy: [true],
            },
        },
        default: 'createdAt',
    },
    {
        displayName: 'Order By Direction',
        name: 'orderByDirection',
        type: 'options',
        options: [
            {
                name: 'Ascending',
                value: 'ASC',
            },
            {
                name: 'Descending',
                value: 'DESC',
            },
        ],
        displayOptions: {
            ...displayOptions,
            show: {
                ...displayOptions.show,
                orderBy: [true],
            },
        },
        default: 'DESC',
        description: 'Sort direction for the column',
    },
];
export async function execute(index) {
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    // Extract sort parameters
    let sortBy;
    const orderBy = this.getNodeParameter('orderBy', index, false);
    if (orderBy) {
        const column = this.getNodeParameter('orderByColumn', index, '');
        if (column) {
            const availableColumns = await dataTableProxy.getColumns();
            const isSystemColumn = DATA_TABLE_SYSTEM_COLUMNS.includes(column);
            if (!isSystemColumn && !availableColumns.find((x) => x.name === column))
                throw new NodeOperationError(this.getNode(), 'Specified column does not exist');
            const direction = this.getNodeParameter('orderByDirection', index, 'ASC');
            sortBy = [column, direction];
        }
    }
    return await executeSelectMany(this, index, dataTableProxy, false, undefined, sortBy);
}
//# sourceMappingURL=get.operation.js.map