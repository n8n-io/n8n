"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
const test_helpers_1 = require("../test-helpers");
let pinecone;
let assistantNameOne;
let assistantNameTwo;
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
    assistantNameOne = (0, test_helpers_1.randomString)(5);
    assistantNameTwo = (0, test_helpers_1.randomString)(5);
    await pinecone.createAssistant({ name: assistantNameOne });
    await pinecone.createAssistant({ name: assistantNameTwo });
});
afterAll(async () => {
    await pinecone.deleteAssistant(assistantNameOne);
    await pinecone.deleteAssistant(assistantNameTwo);
});
describe('listAssistant happy path', () => {
    test('list existing Assistants', async () => {
        const assistants = await pinecone.listAssistants();
        expect(assistants.assistants).toBeDefined();
        if (assistants.assistants) {
            const assistantNames = assistants.assistants.map((assistant) => assistant.name);
            expect(assistantNames).toContain(assistantNameOne);
            expect(assistantNames).toContain(assistantNameTwo);
        }
    });
});
//# sourceMappingURL=listAssistants.test.js.map