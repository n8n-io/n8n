import { validateAirtopApiResponse, validateSessionId } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
export const description = [];
export async function execute(index) {
    const sessionId = validateSessionId.call(this, index);
    const response = await apiRequest.call(this, 'GET', `/sessions/${sessionId}/windows`, undefined);
    validateAirtopApiResponse(this.getNode(), response);
    return this.helpers.returnJsonArray({ sessionId, ...response });
}
//# sourceMappingURL=list.operation.js.map