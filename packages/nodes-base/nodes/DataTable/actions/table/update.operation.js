import { getDataTableProxyExecute } from '../../common/utils';
export const FIELD = 'update';
const displayOptions = {
    show: {
        resource: ['table'],
        operation: [FIELD],
    },
};
export const description = [
    {
        displayName: 'New Name',
        name: 'newName',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'e.g. Renamed Data Table',
        description: 'The new name for the data table',
        displayOptions,
    },
];
export async function execute(index) {
    const newName = this.getNodeParameter('newName', index);
    const dataTableProxy = await getDataTableProxyExecute(this, index);
    const success = await dataTableProxy.updateDataTable({ name: newName });
    return [{ json: { success, name: newName } }];
}
//# sourceMappingURL=update.operation.js.map