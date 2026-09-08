import { executeRequestWithSessionManagement } from '../common/session.utils';
export async function execute(index) {
    const result = await executeRequestWithSessionManagement.call(this, index, {
        method: 'POST',
        path: '/sessions/{sessionId}/windows/{windowId}/scrape-content',
        body: {},
    });
    return this.helpers.returnJsonArray({ ...result });
}
//# sourceMappingURL=scrape.operation.js.map