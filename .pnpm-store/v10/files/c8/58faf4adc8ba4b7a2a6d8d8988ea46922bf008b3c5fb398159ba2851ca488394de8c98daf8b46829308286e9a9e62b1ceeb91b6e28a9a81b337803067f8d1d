"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
let pinecone, serverlessIndexName;
beforeAll(() => {
    pinecone = new index_1.Pinecone();
    if (!process.env.SERVERLESS_INDEX_NAME) {
        throw new Error('SERVERLESS_INDEX_NAME environment variable is not set');
    }
    serverlessIndexName = process.env.SERVERLESS_INDEX_NAME;
});
describe('describe index; serverless', () => {
    test('describe index, happy path', async () => {
        const description = await pinecone.describeIndex(serverlessIndexName);
        expect(description.name).toEqual(serverlessIndexName);
        expect(description.dimension).toEqual(2);
        expect(description.metric).toEqual('dotproduct');
        expect(description.host).toBeDefined();
        expect(description.spec.serverless).toBeDefined();
        expect(description.spec.serverless?.cloud).toEqual('aws');
        expect(description.spec.serverless?.region).toEqual('us-west-2');
        expect(description.status.ready).toEqual(true);
        expect(description.status.state).toEqual('Ready');
        expect(description.tags).toEqual({
            project: 'pinecone-integration-tests-serverless',
        });
    });
});
test('describe index with invalid index name', async () => {
    expect.assertions(1);
    try {
        return await pinecone.describeIndex('non-existent-index');
    }
    catch (e) {
        const err = e;
        expect(err.name).toEqual('PineconeNotFoundError');
    }
});
//# sourceMappingURL=describeIndex.test.js.map