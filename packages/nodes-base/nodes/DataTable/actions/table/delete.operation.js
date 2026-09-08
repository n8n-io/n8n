import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'delete';
const displayOptions = {
    show: {
        resource: ['table'],
        operation: [FIELD],
    },
};
export const description = [
    {
        displayName: 'This will permanently delete the data table and all its data. This action cannot be undone.',
        name: 'deleteWarning',
        type: 'notice',
        default: '',
        displayOptions,
    },
];
export async function execute(index) {
    const dataTableId = this.getNodeParameter(DATA_TABLE_ID_FIELD, index, undefined, {
        extractValue: true,
    });
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const success = await dataTableProxy.deleteDataTable();
    return [{ json: { success, deletedTableId: dataTableId } }];
}
//# sourceMappingURL=delete.operation.js.map