"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const test_helpers_1 = require("../../test-helpers");
describe('bulk import', () => {
    let pinecone, index;
    const indexName = (0, test_helpers_1.randomIndexName)('bulk-import-integration-test');
    const testURI = 's3://dev-bulk-import-datasets-pub/10-records-dim-10/';
    beforeAll(async () => {
        pinecone = new index_1.Pinecone();
        await pinecone.createIndex({
            name: indexName,
            dimension: 10,
            metric: 'cosine',
            spec: {
                serverless: {
                    region: 'us-west-2',
                    cloud: 'aws',
                },
            },
            waitUntilReady: true,
        });
        index = pinecone.index(indexName);
    });
    afterAll(async () => {
        await (0, test_helpers_1.retryDeletes)(pinecone, indexName);
    });
    test('verify bulk import', async () => {
        const response = await index.startImport(testURI);
        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
    });
});
//# sourceMappingURL=bulkImport.test.js.map