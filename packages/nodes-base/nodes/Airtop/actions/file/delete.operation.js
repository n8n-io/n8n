import { NodeOperationError } from 'n8n-workflow';
import { ERROR_MESSAGES } from '../../constants';
import { apiRequest } from '../../transport';
export const description = [
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'string',
        default: '',
        required: true,
        description: 'ID of the file to delete',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['deleteFile'],
            },
        },
    },
];
export async function execute(index) {
    const fileId = this.getNodeParameter('fileId', index, '');
    if (!fileId) {
        throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'File ID'));
    }
    await apiRequest.call(this, 'DELETE', `/files/${fileId}`);
    return this.helpers.returnJsonArray({ data: { message: 'File deleted successfully' } });
}
//# sourceMappingURL=delete.operation.js.map