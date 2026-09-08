import * as deleteRecord from '../../../../v2/actions/record/deleteRecord.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';
vi.mock('../../../../v2/transport', async () => {
    const originalModule = await vi.importActual('../../../../v2/transport');
    return {
        ...originalModule,
        apiRequest: vi.fn(async function () {
            return {};
        }),
    };
});
describe('Test AirtableV2, deleteRecord operation', () => {
    it('should delete a record', async () => {
        const nodeParameters = {
            operation: 'deleteRecord',
            id: 'recXXX',
        };
        const items = [
            {
                json: {},
            },
        ];
        await deleteRecord.execute.call(createMockExecuteFunction(nodeParameters), items, 'appYoLbase', 'tblltable');
        expect(transport.apiRequest).toHaveBeenCalledTimes(1);
        expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', 'appYoLbase/tblltable/recXXX');
    });
});
//# sourceMappingURL=deleteRecord.test.js.map