"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
const test_helpers_1 = require("../test-helpers");
const errors_1 = require("../../errors");
let pinecone;
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
});
describe('updateAssistant inplace updates, happy path', () => {
    test('simple update', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        await pinecone.createAssistant({
            name: assistantName,
            instructions: 'test-instructions',
            metadata: { key: 'value', keyTwo: 'valueTwo' },
            region: 'us',
        });
        await pinecone.updateAssistant(assistantName, {
            instructions: 'new-instructions',
            metadata: { key: 'newValue', keyTwo: 'newValueTwo' },
        });
        const description = await pinecone.describeAssistant(assistantName);
        expect(description.instructions).toEqual('new-instructions');
        expect(description.metadata).toEqual({
            key: 'newValue',
            keyTwo: 'newValueTwo',
        });
        await pinecone.deleteAssistant(assistantName);
    });
    test('updateAssistant with new metadata key:value pair', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        await pinecone.createAssistant({
            name: assistantName,
            metadata: { key: 'value', keyTwo: 'valueTwo' },
        });
        await pinecone.updateAssistant(assistantName, {
            metadata: { keyThree: 'valueThree' },
        });
        const description = await pinecone.describeAssistant(assistantName);
        expect(description.metadata).toEqual({ keyThree: 'valueThree' });
        await pinecone.deleteAssistant(assistantName);
    });
});
describe('updateAssistant error paths', () => {
    test('Update non-existent assistant', async () => {
        const throwError = async () => {
            await pinecone.updateAssistant('non-existent-assistant', {});
        };
        await expect(throwError()).rejects.toThrow(errors_1.PineconeNotFoundError);
    });
});
//# sourceMappingURL=updateAssistant.test.js.map