"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
let pinecone;
let assistant;
let assistantName;
let fileId;
if (!process.env.ASSISTANT_NAME) {
    throw new Error('ASSISTANT_NAME environment variable is not set');
}
else {
    assistantName = process.env.ASSISTANT_NAME;
}
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
    assistant = pinecone.Assistant(assistantName);
    const files = await assistant.listFiles();
    if (files.files) {
        fileId = files.files.map((f) => f.id)[0];
    }
    else {
        throw new Error('No files found');
    }
});
describe('Describe file happy path', () => {
    test('Describe file', async () => {
        const response = await assistant.describeFile(fileId);
        expect(response).toBeDefined();
        expect(response.status).toBeDefined();
        expect(response.id).toBeDefined();
        if (response.metadata) {
            expect(response.metadata['key']).toBeDefined();
            expect(response.metadata['key']).toEqual('valueOne');
            expect(response.metadata['keyTwo']).toBeDefined();
            expect(response.metadata['keyTwo']).toEqual('valueTwo');
        }
    });
});
describe('Describe file error paths', () => {
    test('Describe with nonexistent fileId', async () => {
        const throwError = async () => {
            await assistant.describeFile('nonexistent-file-id');
        };
        await expect(throwError()).rejects.toThrow(/404/);
    });
    test('Describe with empty fileId', async () => {
        const throwError = async () => {
            await assistant.describeFile('');
        };
        await expect(throwError()).rejects.toThrow();
    });
    test('Describe file with nonexistent assistant', async () => {
        const throwError = async () => {
            await pinecone.Assistant('nonexistent').describeFile(fileId);
        };
        await expect(throwError()).rejects.toThrow(/404/);
    });
});
//# sourceMappingURL=describeFile.test.js.map