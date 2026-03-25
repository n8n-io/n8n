"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
describe('Integration Test: Pinecone Inference API rerank endpoint', () => {
    let model;
    let query;
    let documents;
    let pinecone;
    beforeAll(() => {
        model = 'bge-reranker-v2-m3';
        query = 'What are some good Turkey dishes for Thanksgiving?';
        documents = [
            'document content 1 yay I am about turkey',
            'document content 2',
        ];
        const apiKey = process.env.PINECONE_API_KEY || '';
        pinecone = new pinecone_1.Pinecone({ apiKey });
    });
    test('Confirm high-level response structure', async () => {
        const response = await pinecone.inference.rerank(model, query, documents);
        expect(response.model).toEqual(model);
        expect(response.data).toBeDefined();
        expect(response.usage).toBeDefined();
    });
    test('Confirm lower-level response structure', async () => {
        const response = await pinecone.inference.rerank(model, query, documents);
        expect(response.data.length).toBe(documents.length);
        expect(response.data.map((doc) => doc.index)).toBeDefined();
        expect(response.data.map((doc) => doc.score)).toBeDefined();
        expect(response.data.map((doc) => doc.document)).toBeDefined();
        // @ts-ignore
        // (Just ignoring the fact that technically doc.document['text'] could be undefined)
        expect(response.data.map((doc) => doc.document['text'])).toBeDefined();
    });
    test('Confirm list of strings as docs + rankFields set to customField fails', async () => {
        const myDocuments = ['doc1', 'doc2'];
        const rankFields = ['customField'];
        await expect(pinecone.inference.rerank(model, query, myDocuments, { rankFields })).rejects.toThrow(expect.objectContaining({
            message: expect.stringContaining("field 'customField' not found in document at index 0"),
        }));
    });
    test('Confirm docs as list of objects + no rankFields succeeds, if docs contain `text` key, succeeds', async () => {
        const myDocuments = [{ text: 'doc1' }, { text: 'doc2' }];
        const resp = await pinecone.inference.rerank(model, query, myDocuments);
        expect(resp.usage.rerankUnits).toBeGreaterThanOrEqual(1);
    });
    test('Confirm docs as list of objects with additional customField + no rankfields, succeeds', async () => {
        const myDocuments = [
            { text: 'hi', customField: 'doc1' },
            { text: 'bye', customField: 'doc2' },
        ];
        const resp = await pinecone.inference.rerank(model, query, myDocuments);
        expect(resp.usage.rerankUnits).toBeGreaterThanOrEqual(1);
    });
    test('Confirm docs as list of objects with only custom fields + custom rankFields, succeeds', async () => {
        const myDocuments = [
            { customField2: 'hi', customField: 'doc1' },
            { customField2: 'bye', customField: 'doc2' },
        ];
        const rankFields = ['customField2'];
        const resp = await pinecone.inference.rerank(model, query, myDocuments, {
            rankFields: rankFields,
        });
        expect(resp.usage.rerankUnits).toBeGreaterThanOrEqual(1);
    });
    test('Confirm error thrown if docs as list of objects only has custom fields + no custom rankFields obj is passed', async () => {
        const myDocuments = [
            { customField2: 'hi', customField: 'doc1' },
            { customField2: 'bye', customField: 'doc2' },
        ];
        await expect(pinecone.inference.rerank(model, query, myDocuments)).rejects.toThrow(expect.objectContaining({
            message: expect.stringContaining('Documents must be a list of strings or objects containing the "text" field'),
        }));
    });
    test('Confirm error thrown if rankFields does not match fields in passed documents', async () => {
        const myDocuments = [
            { text: 'doc1', title: 'title1' },
            { text: 'doc2', title: 'title2' },
        ];
        const rankFields = ['NonExistentRankField'];
        await expect(pinecone.inference.rerank(model, query, myDocuments, {
            rankFields: rankFields,
        })).rejects.toThrow(expect.objectContaining({
            message: expect.stringContaining("field 'NonExistentRankField' not found in document at index"),
        }));
    });
    test('Confirm error thrown if rankFields > 1 for model that only allows 1', async () => {
        const myDocuments = [
            { text: 'doc1', title: 'title1' },
            { text: 'doc2', title: 'title2' },
        ];
        const rankFields = ['title', 'text'];
        await expect(pinecone.inference.rerank(model, query, myDocuments, {
            rankFields: rankFields,
        })).rejects.toThrow(expect.objectContaining({
            message: expect.stringContaining('"Only one rank field is supported for model'),
        }));
    });
});
//# sourceMappingURL=rerank.test.js.map