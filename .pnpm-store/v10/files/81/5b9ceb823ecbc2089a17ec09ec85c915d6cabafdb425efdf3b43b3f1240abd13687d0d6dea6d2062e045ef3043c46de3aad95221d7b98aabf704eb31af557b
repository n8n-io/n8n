"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const test_helpers_1 = require("../../test-helpers");
// todo: add pod tests
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
describe('fetch; serverless index, global namespace one', () => {
    test('fetch by id', async () => {
        if (recordIds) {
            const results = await serverlessIndex.fetch(recordIds.slice(0, 3));
            expect(results.records[recordIds[0]].id).toBeDefined();
            expect(results.records[recordIds[1]].id).toBeDefined();
            expect(results.records[recordIds[2]].id).toBeDefined();
            expect(results.usage?.readUnits).toBeDefined();
        }
    });
});
//# sourceMappingURL=fetch.test.js.map