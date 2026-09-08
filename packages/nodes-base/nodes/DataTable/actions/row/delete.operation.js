import { NodeOperationError, } from 'n8n-workflow';
import { DRY_RUN } from '../../common/fields';
import { getSelectFields, getSelectFilter } from '../../common/selectMany';
import { getDataTableProxyExecute, getDryRunParameter } from '../../common/utils';
// named `deleteRows` since `delete` is a reserved keyword
export const FIELD = 'deleteRows';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [FIELD],
    },
};
export const description = [
    ...getSelectFields(displayOptions, true),
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
    const filter = await getSelectFilter(this, index);
    if (filter.filters.length === 0) {
        throw new NodeOperationError(this.getNode(), 'At least one condition is required');
    }
    const result = await dataTableProxy.deleteRows({ filter, dryRun });
    return result.map((json) => ({ json }));
}
//# sourceMappingURL=delete.operation.js.map