"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const update_1 = require("../../vectors/update");
const setupResponse = (response, isSuccess) => {
    const fakeUpdate = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = { updateVector: fakeUpdate };
    const VectorProvider = {
        provide: async () => VOA,
    };
    const cmd = new update_1.UpdateCommand(VectorProvider, 'namespace');
    return { fakeUpdate, VOA, VectorProvider, cmd };
};
const setupSuccess = (response) => {
    return setupResponse(response, true);
};
describe('update', () => {
    test('calls the openapi update endpoint, passing target namespace', async () => {
        const { fakeUpdate, cmd } = setupSuccess('');
        const returned = await cmd.run({
            id: 'fake-vector',
            values: [1, 2, 3, 4, 5],
            sparseValues: {
                indices: [15, 30, 25],
                values: [0.5, 0.5, 0.2],
            },
            metadata: { genre: 'ambient' },
        });
        expect(returned).toBe(void 0);
        expect(fakeUpdate).toHaveBeenCalledWith({
            updateRequest: {
                namespace: 'namespace',
                id: 'fake-vector',
                values: [1, 2, 3, 4, 5],
                sparseValues: {
                    indices: [15, 30, 25],
                    values: [0.5, 0.5, 0.2],
                },
                setMetadata: { genre: 'ambient' },
            },
        });
    });
    test('throws error if no id is provided', async () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            // @ts-ignore
            await cmd.run({
                values: [1, 2, 3, 4, 5],
                sparseValues: { indices: [15, 30, 25], values: [0.5, 0.5, 0.2] },
                metadata: { genre: 'ambient' },
            });
        };
        await expect(toThrow()).rejects.toThrowError('You must enter a non-empty string for the `id` field in order to update a record.');
    });
    test('throws error if no unknown property is passed', async () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            await cmd.run({
                id: 'abc',
                values: [1, 2, 3, 4, 5],
                sparseValues: { indices: [15, 30, 25], values: [0.5, 0.5, 0.2] },
                metadata: { genre: 'ambient' },
                // @ts-ignore
                unknown: 'property',
            });
        };
        await expect(toThrow()).rejects.toThrowError('Object contained invalid properties: unknown. Valid properties include id, values, sparseValues, metadata.');
    });
    test('throws error if no known property is misspelled', async () => {
        const { cmd } = setupSuccess('');
        const toThrow = async () => {
            await cmd.run({
                id: 'abc',
                values: [1, 2, 3, 4, 5],
                sparseValues: { indices: [15, 30, 25], values: [0.5, 0.5, 0.2] },
                // @ts-ignore
                metadataaaa: { genre: 'ambient' },
            });
        };
        await expect(toThrow()).rejects.toThrowError('Object contained invalid properties: metadataaaa. Valid properties include id, values, sparseValues, metadata.');
    });
});
//# sourceMappingURL=update.test.js.map