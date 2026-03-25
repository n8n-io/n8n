"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../vectors/fetch");
const setupResponse = (response, isSuccess) => {
    const fakeFetch = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = { fetchVectors: fakeFetch };
    const VectorProvider = {
        provide: async () => VOA,
    };
    const cmd = new fetch_1.FetchCommand(VectorProvider, 'namespace');
    return { VOA, VectorProvider, cmd };
};
const setupSuccess = (response) => {
    return setupResponse(response, true);
};
describe('fetch', () => {
    test('calls the openapi fetch endpoint, passing target namespace', async () => {
        const { VOA, cmd } = setupSuccess({ vectors: [] });
        const returned = await cmd.run(['1', '2']);
        expect(returned).toEqual({ records: [], namespace: '' });
        expect(VOA.fetchVectors).toHaveBeenCalledWith({
            ids: ['1', '2'],
            namespace: 'namespace',
        });
    });
    test('Throws error if pass in empty array', async () => {
        const { cmd } = setupSuccess({ vectors: [] });
        const toThrow = async () => {
            await cmd.run([]);
        };
        await expect(toThrow()).rejects.toThrowError('Must pass in at least 1 recordID.');
    });
});
//# sourceMappingURL=fetch.test.js.map