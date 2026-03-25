"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
describe('Integration Test: Pinecone Inference API embeddings endpoint', () => {
    let inputs;
    let params;
    let model;
    let pinecone;
    beforeAll(() => {
        inputs = ['hello', 'world'];
        params = {
            input_type: 'passage',
            truncate: 'END',
        };
        model = 'multilingual-e5-large';
        const apiKey = process.env.PINECONE_API_KEY || '';
        pinecone = new pinecone_1.Pinecone({ apiKey });
    });
    test('Confirm output types', async () => {
        const response = await pinecone.inference.embed(model, inputs, params);
        expect(response.model).toBeDefined();
        expect(response.data).toBeDefined();
        expect(response.usage).toBeDefined();
    });
});
//# sourceMappingURL=embed.test.js.map