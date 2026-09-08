import { constructInteractionRequest } from './helpers';
import { validateRequiredStringField, validateSessionAndWindowId, validateAirtopApiResponse, } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { elementDescriptionField } from '../common/fields';
export const description = [
    {
        ...elementDescriptionField,
        required: true,
        placeholder: 'e.g. the rounded user profile image at the top right of the page',
        displayOptions: {
            show: {
                resource: ['interaction'],
                operation: ['hover'],
            },
        },
    },
];
export async function execute(index) {
    const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
    const elementDescription = validateRequiredStringField.call(this, index, 'elementDescription', 'Element Description');
    const request = constructInteractionRequest.call(this, index, {
        elementDescription,
    });
    const response = await apiRequest.call(this, 'POST', `/sessions/${sessionId}/windows/${windowId}/hover`, request);
    validateAirtopApiResponse(this.getNode(), response);
    return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
//# sourceMappingURL=hover.operation.js.map