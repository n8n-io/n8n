"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const test_helpers_1 = require("../../test-helpers");
let pinecone, serverlessIndex;
beforeAll(async () => {
    pinecone = new index_1.Pinecone();
    if (!process.env.SERVERLESS_INDEX_NAME) {
        throw new Error('SERVERLESS_INDEX_NAME environment variable is not set');
    }
    const serverlessIndexName = process.env.SERVERLESS_INDEX_NAME;
    serverlessIndex = pinecone
        .index(serverlessIndexName)
        .namespace(test_helpers_1.globalNamespaceOne);
});
describe('listPaginated, serverless index', () => {
    test('test listPaginated with no arguments', async () => {
        const listResults = await serverlessIndex.listPaginated();
        expect(listResults).toBeDefined();
        expect(listResults.pagination).toBeUndefined(); // Only 11 records in the index, so no pag token returned
        expect(listResults.vectors?.length).toBe(11);
        expect(listResults.namespace).toBe(test_helpers_1.globalNamespaceOne);
    });
    // TODO: consistent 500s on this test, re-enable when fixed
    // test('test listPaginated with prefix', async () => {
    //   const listResults = await serverlessIndex.listPaginated({
    //     prefix: diffPrefix,
    //   });
    //   expect(listResults.namespace).toBe(globalNamespaceOne);
    //   expect(listResults.vectors?.length).toBe(1);
    //   expect(listResults.pagination).toBeUndefined();
    // });
    test('test listPaginated with limit and pagination', async () => {
        const listResults = await serverlessIndex.listPaginated({
            prefix: test_helpers_1.prefix,
            limit: 3,
        });
        expect(listResults.namespace).toBe(test_helpers_1.globalNamespaceOne);
        expect(listResults.vectors?.length).toBe(3);
        expect(listResults.pagination).toBeDefined();
        const listResultsPg2 = await serverlessIndex.listPaginated({
            prefix: test_helpers_1.prefix,
            limit: 5,
            paginationToken: listResults.pagination?.next,
        });
        expect(listResultsPg2.namespace).toBe(test_helpers_1.globalNamespaceOne);
        expect(listResultsPg2.vectors?.length).toBe(5);
    });
});
//# sourceMappingURL=list.test.js.map