import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'rowNotExists';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [FIELD],
    },
};
export const description = [...getSelectFields(displayOptions, true, true)];
export async function execute(index) {
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const hits = await executeSelectMany(this, index, dataTableProxy, undefined, 1);
    return hits.length === 0 ? [this.getInputData()[index]] : [];
}
//# sourceMappingURL=rowNotExists.operation.js.map