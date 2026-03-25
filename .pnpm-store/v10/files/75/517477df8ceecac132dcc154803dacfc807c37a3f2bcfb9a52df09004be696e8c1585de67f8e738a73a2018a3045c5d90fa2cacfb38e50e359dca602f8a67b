"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upsert_1 = require("../../vectors/upsert");
const setupResponse = (response, isSuccess) => {
    const fakeUpsert = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = { upsertVectors: fakeUpsert };
    const VectorProvider = {
        provide: async () => VOA,
    };
    const cmd = new upsert_1.UpsertCommand(VectorProvider, 'namespace');
    return { fakeUpsert, VOA, VectorProvider, cmd };
};
const setupSuccess = (response) => {
    return setupResponse(response, true);
};
describe('upsert', () => {
    test('calls the openapi upsert endpoint', async () => {
        const { fakeUpsert, cmd } = setupSuccess('');
        const returned = await cmd.run([{ id: '1', values: [1, 2, 3] }]);
        expect(returned).toBe(void 0);
        expect(fakeUpsert).toHaveBeenCalledWith({
            upsertRequest: {
                namespace: 'namespace',
                vectors: [{ id: '1', values: [1, 2, 3] }],
            },
        });
    });
    test('throw error if known property is misspelled', async () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            // @ts-ignore
            await cmd.run([{ id: '1', valuess: [1, 2, 3] }]);
        };
        await expect(toThrow()).rejects.toThrowError('Object contained invalid properties: valuess. Valid properties include id, values, sparseValues, metadata.');
    });
    test('throw error if records array is empty', async () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            // @ts-ignore
            await cmd.run([]);
        };
        await expect(toThrow()).rejects.toThrowError('Must pass in at least 1 record to upsert.');
    });
    test('throw error if id is empty', async () => {
        const { cmd } = setupSuccess('');
        // Missing `id` property
        const toThrow = async () => {
            // @ts-ignore
            await cmd.run([{ values: [1, 2, 3] }]);
        };
        await expect(toThrow()).rejects.toThrowError('Every record must include an `id` property in order to upsert.');
    });
    test('throw error if values and sparseValues are empty', () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            // @ts-ignore
            await cmd.run([{ id: '1' }]);
        };
        expect(toThrow()).rejects.toThrowError('Every record must include either `values` or `sparseValues` in order to upsert.');
    });
});
//# sourceMappingURL=upsert.test.js.map