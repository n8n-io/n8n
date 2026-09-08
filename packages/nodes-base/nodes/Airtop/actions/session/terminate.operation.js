import { validateAirtopApiResponse, validateSessionId } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { sessionIdField } from '../common/fields';
export const description = [
    {
        ...sessionIdField,
        displayOptions: {
            show: {
                resource: ['session'],
                operation: ['terminate'],
            },
        },
    },
];
export async function execute(index) {
    const sessionId = validateSessionId.call(this, index);
    const response = await apiRequest.call(this, 'DELETE', `/sessions/${sessionId}`);
    // validate response
    validateAirtopApiResponse(this.getNode(), response);
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=terminate.operation.js.map