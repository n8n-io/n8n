"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
const test_helpers_1 = require("../test-helpers");
const errors_1 = require("../../errors");
let pinecone;
let assistantName;
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
    assistantName = (0, test_helpers_1.randomString)(5);
    await pinecone.createAssistant({ name: assistantName });
    await (0, test_helpers_1.sleep)(2000);
});
afterAll(async () => {
    await pinecone.deleteAssistant(assistantName);
});
describe('describeAssistant happy path', () => {
    test('simple get', async () => {
        const assistantInfo = await pinecone.describeAssistant(assistantName);
        expect(assistantInfo.name).toEqual(assistantName);
        expect(assistantInfo.instructions).toBeUndefined();
        expect(assistantInfo.metadata).toBeUndefined();
        expect(assistantInfo.status).toBeDefined();
        expect(assistantInfo.host).toBeDefined();
        expect(assistantInfo.createdAt).toBeDefined();
        expect(assistantInfo.updatedAt).toBeDefined();
    });
});
describe('describeAssistant error paths', () => {
    test('get non-existent assistant', async () => {
        const throwError = async () => {
            await pinecone.describeAssistant('non-existent-assistant');
        };
        await expect(throwError()).rejects.toThrow(errors_1.PineconeNotFoundError);
    });
});
//# sourceMappingURL=getAssistant.test.js.map