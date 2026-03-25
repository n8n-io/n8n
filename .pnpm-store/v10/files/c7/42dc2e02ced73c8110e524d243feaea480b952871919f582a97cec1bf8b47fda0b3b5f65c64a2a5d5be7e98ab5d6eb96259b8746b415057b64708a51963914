"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
let pinecone, serverlessIndexName;
beforeAll(async () => {
    pinecone = new index_1.Pinecone();
    if (!process.env.SERVERLESS_INDEX_NAME) {
        throw new Error('SERVERLESS_INDEX_NAME environment variable is not set');
    }
    serverlessIndexName = process.env.SERVERLESS_INDEX_NAME;
});
describe('list indexes; serverless', () => {
    test('list indexes', async () => {
        const response = await pinecone.listIndexes();
        expect(response.indexes).toBeDefined();
        expect(response.indexes?.length).toBeGreaterThan(0);
        expect(response.indexes?.map((i) => i.name)).toContain(serverlessIndexName);
    });
});
//# sourceMappingURL=listIndexes.test.js.map