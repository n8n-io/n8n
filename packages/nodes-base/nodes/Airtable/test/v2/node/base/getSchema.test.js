import { mockDeep } from 'vitest-mock-extended';
import get from 'lodash/get';
import * as getSchema from '../../../../v2/actions/base/getSchema.operation';
import * as transport from '../../../../v2/transport';
vi.mock('../../../../v2/transport', async () => {
    const originalModule = await vi.importActual('../../../../v2/transport');
    return {
        ...originalModule,
        apiRequest: vi.fn(async function () {
            return { tables: [] };
        }),
    };
});
describe('Test AirtableV2, base => getSchema', () => {
    it('should return all bases', async () => {
        const nodeParameters = {
            resource: 'base',
            operation: 'getSchema',
            base: {
                value: '={{$json.id}}',
            },
        };
        const items = [
            {
                json: { id: 'appYobase1' },
            },
            {
                json: { id: 'appYobase2' },
            },
        ];
        await getSchema.execute.call(mockDeep({
            getInputData: vi.fn(() => items),
            getNodeParameter: vi.fn((param, itemIndex) => {
                if (param === 'base') {
                    return items[itemIndex].json.id;
                }
                return get(nodeParameters, param);
            }),
        }), items);
        expect(transport.apiRequest).toBeCalledTimes(2);
        expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appYobase1/tables');
        expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appYobase2/tables');
    });
});
//# sourceMappingURL=getSchema.test.js.map