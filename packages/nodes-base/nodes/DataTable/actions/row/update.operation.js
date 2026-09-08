import { NodeOperationError, } from 'n8n-workflow';
import { makeAddRow, getAddRow } from '../../common/addRow';
import { DRY_RUN } from '../../common/fields';
import { getSelectFields, getSelectFilter } from '../../common/selectMany';
import { getDataTableProxyExecute, getDryRunParameter } from '../../common/utils';
export const FIELD = 'update';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [FIELD],
    },
};
export const description = [
    ...getSelectFields(displayOptions, true),
    makeAddRow(FIELD, displayOptions),
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add option',
        options: [DRY_RUN],
        displayOptions,
    },
];
export async function execute(index) {
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const dryRun = getDryRunParameter(this, index);
    const row = getAddRow(this, index);
    const filter = await getSelectFilter(this, index);
    if (filter.filters.length === 0) {
        throw new NodeOperationError(this.getNode(), 'At least one condition is required');
    }
    const updatedRows = await dataTableProxy.updateRows({
        data: row,
        filter,
        dryRun,
    });
    return updatedRows.map((json) => ({ json }));
}
//# sourceMappingURL=update.operation.js.map