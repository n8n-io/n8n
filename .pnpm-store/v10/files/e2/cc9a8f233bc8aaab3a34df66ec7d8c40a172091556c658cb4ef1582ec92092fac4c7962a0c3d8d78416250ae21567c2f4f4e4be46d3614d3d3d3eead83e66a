"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const test_helpers_1 = require("../../test-helpers");
let pinecone;
let srvrlssIndexDense;
let srvrlssIndexDenseName;
let srvrlssIndexSparse;
let srvrlssIndexSparseName;
beforeAll(async () => {
    pinecone = new index_1.Pinecone();
    srvrlssIndexDenseName = (0, test_helpers_1.randomIndexName)('test-srvrlss-dense-upsert-update');
    srvrlssIndexSparseName = (0, test_helpers_1.randomIndexName)('test-srvrlss-sparse-upsert-update');
    const densePromise = pinecone.createIndex({
        name: srvrlssIndexDenseName,
        dimension: 2,
        metric: 'cosine',
        spec: {
            serverless: {
                region: 'us-east-1',
                cloud: 'aws',
            },
        },
        vectorType: 'dense',
        waitUntilReady: true,
        suppressConflicts: true,
    });
    const sparsePromise = pinecone.createIndex({
        name: srvrlssIndexSparseName,
        metric: 'dotproduct',
        spec: {
            serverless: {
                region: 'us-east-1',
                cloud: 'aws',
            },
        },
        vectorType: 'sparse',
        waitUntilReady: true,
        suppressConflicts: true,
    });
    await Promise.all([densePromise, sparsePromise]);
    srvrlssIndexDense = pinecone
        .index(srvrlssIndexDenseName)
        .namespace(test_helpers_1.globalNamespaceOne);
    srvrlssIndexSparse = pinecone
        .index(srvrlssIndexSparseName)
        .namespace(test_helpers_1.globalNamespaceOne);
});
afterAll(async () => {
    const deleteDense = pinecone.deleteIndex(srvrlssIndexDenseName);
    const deleteSparse = pinecone.deleteIndex(srvrlssIndexSparseName);
    await Promise.all([deleteDense, deleteSparse]);
});
describe('upsert and update', () => {
    describe('dense indexes', () => {
        test('verify upsert and update', async () => {
            const recordToUpsert = (0, test_helpers_1.generateRecords)({
                dimension: 2,
                quantity: 1,
                withSparseValues: false,
                withMetadata: true,
            });
            await srvrlssIndexDense.upsert(recordToUpsert);
            const newValues = [0.5, 0.4];
            const newMetadata = { flavor: 'chocolate' };
            const updateSpy = jest
                .spyOn(srvrlssIndexDense, 'update')
                .mockResolvedValue(undefined);
            await srvrlssIndexDense.update({
                id: '0',
                values: newValues,
                metadata: newMetadata,
            });
            expect(updateSpy).toHaveBeenCalledWith({
                id: '0',
                values: newValues,
                metadata: newMetadata,
            });
            updateSpy.mockRestore();
        });
    });
    describe('sparse indexes', () => {
        test('verify upsert and update', async () => {
            const recordToUpsert = (0, test_helpers_1.generateRecords)({
                dimension: 2,
                quantity: 1,
                withSparseValues: true,
                withValues: false,
                withMetadata: true,
            });
            await srvrlssIndexSparse.upsert(recordToUpsert);
            const newSparseValues = [0.5, 0.4];
            const newSparseIndices = [0, 1];
            const sparseValues = {
                values: newSparseValues,
                indices: newSparseIndices,
            };
            const newMetadata = { flavor: 'chocolate' };
            const updateSpy = jest
                .spyOn(srvrlssIndexSparse, 'update')
                .mockResolvedValue(undefined);
            await srvrlssIndexSparse.update({
                id: '0',
                sparseValues: sparseValues,
                metadata: newMetadata,
            });
            expect(updateSpy).toHaveBeenCalledWith({
                id: '0',
                sparseValues: sparseValues,
                metadata: newMetadata,
            });
            updateSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=upsertAndUpdate.test.js.map