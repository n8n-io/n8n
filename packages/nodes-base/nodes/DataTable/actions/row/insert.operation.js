import { getAddRow, makeAddRow } from '../../common/addRow';
import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'insert';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [FIELD],
    },
};
export const description = [
    makeAddRow(FIELD, displayOptions),
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
            {
                displayName: 'Optimize Bulk',
                name: 'optimizeBulk',
                type: 'boolean',
                default: false,
                noDataExpression: true, // bulk inserts don't support expressions so this is a bit paradoxical
                description: 'Whether to improve bulk insert performance 5x by not returning inserted data',
            },
        ],
        displayOptions,
    },
];
export async function execute(index) {
    const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', index, false);
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const row = getAddRow(this, index);
    if (optimizeBulkEnabled) {
        // This function is always called by index, so we inherently cannot operate in bulk
        this.addExecutionHints({
            message: 'Unable to optimize bulk insert due to expression in Data table ID ',
            location: 'outputPane',
        });
        const json = await dataTableProxy.insertRows([row], 'count');
        return [{ json }];
    }
    else {
        const insertedRows = await dataTableProxy.insertRows([row], 'all');
        return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
    }
}
export async function executeBulk(proxy) {
    const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', 0, false);
    const rows = this.getInputData().flatMap((_, i) => [getAddRow(this, i)]);
    if (optimizeBulkEnabled) {
        const json = await proxy.insertRows(rows, 'count');
        return [{ json }];
    }
    else {
        const insertedRows = await proxy.insertRows(rows, 'all');
        return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
    }
}
//# sourceMappingURL=insert.operation.js.map