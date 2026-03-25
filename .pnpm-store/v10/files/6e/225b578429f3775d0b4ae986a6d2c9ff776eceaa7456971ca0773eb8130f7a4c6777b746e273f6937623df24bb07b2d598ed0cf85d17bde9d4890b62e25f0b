"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const searchRecords_1 = require("../../vectors/searchRecords");
const errors_1 = require("../../../errors");
const mockNamespace = 'mock-namespace';
const setupResponse = (response, isSuccess) => {
    const fakeSearchRecords = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = {
        searchRecordsNamespace: fakeSearchRecords,
    };
    const VectorProvider = {
        provide: async () => VOA,
    };
    const cmd = new searchRecords_1.SearchRecordsCommand(VectorProvider, mockNamespace);
    return { fakeSearchRecords, VOA, VectorProvider, cmd };
};
describe('SearchRecordsCommand', () => {
    test('calls the openapi search records endpoint', async () => {
        const { fakeSearchRecords, cmd } = setupResponse('', true);
        const mockSearchRequest = {
            query: {
                topK: 2,
                filter: { test: 'test' },
                inputs: { chunk: 'input' },
                vector: { sparseValues: [0.2, 0.5, 0.6], sparseIndicies: [1, 2, 3] },
            },
            fields: ['chunk', 'test'],
            rerank: {
                model: 'test-model',
                rankFields: ['rank-test'],
                topN: 5,
                parameters: { test_param: 'test_param' },
                query: 'test query',
            },
        };
        const returned = await cmd.run(mockSearchRequest);
        expect(returned).toBe('');
        expect(fakeSearchRecords).toHaveBeenCalledWith({
            namespace: mockNamespace,
            searchRecordsRequest: mockSearchRequest,
        });
    });
    test('missing query object throws error', async () => {
        const { cmd } = setupResponse('', true);
        try {
            // @ts-ignore
            await cmd.run({});
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.PineconeArgumentError);
            expect(err.message).toBe('You must pass a `query` object to search.');
        }
    });
});
//# sourceMappingURL=searchRecords.test.js.map