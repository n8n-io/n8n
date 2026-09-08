import { NodeOperationError } from 'n8n-workflow';
import { pushFileToSession, triggerFileInput } from './helpers';
import { sessionIdField, windowIdField, elementDescriptionField, includeHiddenElementsField, } from '../common/fields';
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['load'],
    },
};
export const description = [
    {
        ...sessionIdField,
        description: 'The session ID to load the file into',
        displayOptions,
    },
    {
        ...windowIdField,
        description: 'The window ID to trigger the file input in',
        displayOptions,
    },
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'string',
        default: '',
        required: true,
        description: 'ID of the file to load into the session',
        displayOptions,
    },
    {
        ...elementDescriptionField,
        description: 'Optional description of the file input to interact with',
        placeholder: 'e.g. the file upload selection box',
        displayOptions,
    },
    {
        ...includeHiddenElementsField,
        displayOptions,
    },
];
export async function execute(index) {
    const fileId = this.getNodeParameter('fileId', index, '');
    const sessionId = this.getNodeParameter('sessionId', index, '');
    const windowId = this.getNodeParameter('windowId', index, '');
    const elementDescription = this.getNodeParameter('elementDescription', index, '');
    const includeHiddenElements = this.getNodeParameter('includeHiddenElements', index, false);
    try {
        await pushFileToSession.call(this, fileId, sessionId);
        await triggerFileInput.call(this, {
            fileId,
            windowId,
            sessionId,
            elementDescription,
            includeHiddenElements,
        });
        return this.helpers.returnJsonArray({
            sessionId,
            windowId,
            data: {
                message: 'File loaded successfully',
            },
        });
    }
    catch (error) {
        throw new NodeOperationError(this.getNode(), error);
    }
}
//# sourceMappingURL=load.operation.js.map