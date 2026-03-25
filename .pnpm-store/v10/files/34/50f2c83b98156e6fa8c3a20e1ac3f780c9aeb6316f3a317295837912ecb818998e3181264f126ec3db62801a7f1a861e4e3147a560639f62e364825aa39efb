"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
const test_helpers_1 = require("../test-helpers");
const errors_1 = require("../../errors");
let pinecone;
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
});
describe('deleteAssistant happy path', () => {
    test('simple delete', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        await pinecone.createAssistant({
            name: assistantName,
        });
        await pinecone.deleteAssistant(assistantName);
        await (0, test_helpers_1.sleep)(3000);
    });
});
describe('deleteAssistant error paths', () => {
    test('delete non-existent assistant', async () => {
        await expect(pinecone.deleteAssistant('non-existent-assistant')).rejects.toThrow(errors_1.PineconeNotFoundError);
    });
});
//# sourceMappingURL=deleteAssistant.test.js.map