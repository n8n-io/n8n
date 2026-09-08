import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'clear';
const displayOptions = {
    show: {
        resource: ['table'],
        operation: [FIELD],
    },
};
export const description = [
    {
        displayName: 'This will permanently delete all rows from the data table. The table structure will be retained. This action cannot be undone.',
        name: 'clearWarning',
        type: 'notice',
        default: '',
        displayOptions,
    },
];
export async function execute(index) {
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const result = await dataTableProxy.clearRows();
    return [{ json: { success: true, deletedCount: result.deletedCount } }];
}
//# sourceMappingURL=clear.operation.js.map