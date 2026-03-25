"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("../../vectors/query");
const errors_1 = require("../../../errors");
const setupResponse = (response, isSuccess) => {
    const fakeQuery = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = { queryVectors: fakeQuery };
    const VectorProvider = {
        provide: async () => VOA,
    };
    const cmd = new query_1.QueryCommand(VectorProvider, 'namespace');
    return { fakeQuery, VOA, VectorProvider, cmd };
};
describe('Query command tests', () => {
    test('should throw error when known property is misspelled', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        await expect(
        // @ts-ignore - Testing invalid property
        cmd.run({ id: 'abc', topK: 2, includeMetadataaaaa: true })).rejects.toThrow(errors_1.PineconeArgumentError);
        await expect(
        // @ts-ignore - Testing invalid property
        cmd.run({ id: 'abc', topK: 2, includeMetadataaaaa: true })).rejects.toThrow('Object contained invalid properties: includeMetadataaaaa. Valid properties include id, vector, sparseVector,' +
            ' includeValues, includeMetadata, filter, topK.');
    });
    test('should throw error when no options obj is passed', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        // @ts-ignore
        await expect(cmd.run()).rejects.toThrow(errors_1.PineconeArgumentError);
        // @ts-ignore
        await expect(cmd.run()).rejects.toThrow('You must enter a query configuration object to query the index.');
    });
    test('should throw error when topK is not passed', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        // @ts-ignore
        await expect(cmd.run({})).rejects.toThrow(errors_1.PineconeArgumentError);
        // @ts-ignore
        await expect(cmd.run({})).rejects.toThrow('You must enter an integer for the `topK` search results to be returned.');
    });
    test('should throw error when topK is negative', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        await expect(cmd.run({ id: 'some-id', topK: -100 })).rejects.toThrow('`topK` property must be greater than 0.');
        await expect(cmd.run({ id: 'some-id', topK: -100 })).rejects.toThrow(errors_1.PineconeArgumentError);
    });
    test('should throw error when filter is empty', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        await expect(cmd.run({ id: 'some-id', topK: 1, filter: {} })).rejects.toThrow('You must enter a `filter` object with at least one key-value pair.');
        await expect(cmd.run({ id: 'some-id', topK: 1, filter: {} })).rejects.toThrow(errors_1.PineconeArgumentError);
    });
    test('should throw error when id is blank string', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        await expect(cmd.run({ id: '', topK: 1 })).rejects.toThrow('You must enter non-empty string for `id` to query by record ID.');
        await expect(cmd.run({ id: '', topK: 1 })).rejects.toThrow(errors_1.PineconeArgumentError);
    });
    test('should throw error when vector is empty array', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        await expect(cmd.run({ vector: [], topK: 1 })).rejects.toThrow('You must enter an array of `RecordValues` in order to query by vector values.');
        await expect(cmd.run({ vector: [], topK: 1 })).rejects.toThrow(errors_1.PineconeArgumentError);
    });
    test('should throw error when sparseVector indices or values is empty array', async () => {
        const { cmd } = setupResponse({ matches: [] }, false);
        // Missing indices
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [], values: [0.1, 0.2] },
        })).rejects.toThrow('You must enter a `RecordSparseValues` object with `indices` and `values` properties in order to query by' +
            ' sparse vector values.');
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [], values: [0.1, 0.2] },
        })).rejects.toThrow(errors_1.PineconeArgumentError);
        // Missing values
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [0.1, 0.2], values: [] },
        })).rejects.toThrow('You must enter a `RecordSparseValues` object with `indices` and `values` properties in order to query by' +
            ' sparse vector values.');
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [0.1, 0.2], values: [] },
        })).rejects.toThrow(errors_1.PineconeArgumentError);
        // Missing both indices and values
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [], values: [] },
        })).rejects.toThrow('You must enter a `RecordSparseValues` object with `indices` and `values` properties in order to query by' +
            ' sparse vector values.');
        await expect(cmd.run({
            vector: [0.2, 0.1],
            topK: 1,
            sparseVector: { indices: [], values: [] },
        })).rejects.toThrow(errors_1.PineconeArgumentError);
    });
});
//# sourceMappingURL=query.test.js.map