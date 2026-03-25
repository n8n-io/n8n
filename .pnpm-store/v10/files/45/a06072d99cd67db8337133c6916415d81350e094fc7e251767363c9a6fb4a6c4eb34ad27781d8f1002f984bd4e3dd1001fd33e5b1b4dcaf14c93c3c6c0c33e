"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const test_helpers_1 = require("../../test-helpers");
let pinecone, serverlessIndex, recordIds;
beforeAll(async () => {
    pinecone = new index_1.Pinecone();
    if (!process.env.SERVERLESS_INDEX_NAME) {
        throw new Error('SERVERLESS_INDEX_NAME environment variable is not set');
    }
    const serverlessIndexName = process.env.SERVERLESS_INDEX_NAME;
    serverlessIndex = pinecone
        .index(serverlessIndexName)
        .namespace(test_helpers_1.globalNamespaceOne);
    recordIds = await (0, test_helpers_1.getRecordIds)(serverlessIndex);
});
describe('query tests on serverless index', () => {
    test('query by id', async () => {
        const topK = 4;
        if (recordIds) {
            if (recordIds.length > 0) {
                const idForQuerying = recordIds[0];
                await (0, test_helpers_1.assertWithRetries)(() => serverlessIndex.query({ id: idForQuerying, topK: 4 }), (results) => {
                    expect(results.matches).toBeDefined();
                    expect(results.matches?.length).toEqual(topK);
                    // Necessary to avoid could-be-undefined error for `usage` field:
                    if (results.usage) {
                        expect(results.usage.readUnits).toBeDefined();
                    }
                });
            }
        }
    });
    test('query when topK is greater than number of records', async () => {
        const topK = 11; // in setup.ts, we seed the serverless index w/11 records
        if (recordIds) {
            const idForQuerying = recordIds[1];
            await (0, test_helpers_1.assertWithRetries)(() => serverlessIndex.query({ id: idForQuerying, topK: topK }), (results) => {
                expect(results.matches).toBeDefined();
                expect(results.matches?.length).toEqual(11); // expect 11 records to be returned
                // Necessary to avoid could-be-undefined error for `usage` field:
                if (results.usage) {
                    expect(results.usage.readUnits).toBeDefined();
                }
            });
        }
    });
    test('with invalid id, returns empty results', async () => {
        const topK = 2;
        await (0, test_helpers_1.assertWithRetries)(() => serverlessIndex.query({ id: '12354523423', topK }), (results) => {
            expect(results.matches).toBeDefined();
            expect(results.matches?.length).toEqual(0);
        });
    });
    test('query with vector values', async () => {
        const topK = 1;
        await (0, test_helpers_1.assertWithRetries)(() => serverlessIndex.query({
            vector: [0.11, 0.22],
            topK,
        }), (results) => {
            expect(results.matches).toBeDefined();
            expect(results.matches?.length).toEqual(topK);
            if (results.usage) {
                expect(results.usage.readUnits).toBeDefined();
            }
        });
    });
    test('query with includeValues: true', async () => {
        const queryVec = Array.from({ length: 2 }, () => Math.random());
        await (0, test_helpers_1.assertWithRetries)(() => serverlessIndex.query({
            vector: queryVec,
            topK: 2,
            includeValues: true,
            includeMetadata: true,
        }), (results) => {
            expect(results.matches).toBeDefined();
            expect(results.matches?.length).toEqual(2);
            // Necessary to avoid could-be-undefined error for `usage` field:
            if (results.usage) {
                expect(results.usage.readUnits).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=query.test.js.map