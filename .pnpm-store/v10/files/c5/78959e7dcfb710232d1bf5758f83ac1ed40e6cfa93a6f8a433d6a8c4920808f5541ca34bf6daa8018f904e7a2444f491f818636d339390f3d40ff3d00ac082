"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
const test_helpers_1 = require("../test-helpers");
let pinecone;
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
});
describe('createAssistant happy path', () => {
    test('simple create', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        await pinecone.createAssistant({
            name: assistantName,
            instructions: 'test-instructions',
            metadata: { key: 'value', keyTwo: 'valueTwo' },
            region: 'us',
        });
        await (0, test_helpers_1.sleep)(2000);
        const description = await pinecone.describeAssistant(assistantName);
        expect(description.name).toEqual(assistantName);
        expect(description.instructions).toEqual('test-instructions');
        expect(description.metadata).toEqual({ key: 'value', keyTwo: 'valueTwo' });
        await pinecone.deleteAssistant(assistantName);
    });
});
describe('createAssistant error paths', () => {
    test('createAssistant with too much metadata', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        const throwError = async () => {
            await pinecone.createAssistant({
                name: assistantName,
                metadata: { key: 'a'.repeat(1000000) },
            });
        };
        await expect(throwError()).rejects.toThrow('Metadata is too large');
    });
    test('createAssistant with invalid region', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        const throwError = async () => {
            await pinecone.createAssistant({
                name: assistantName,
                region: 'invalid-region',
            });
        };
        await expect(throwError()).rejects.toThrow('Invalid region specified. Must be one of "us" or "eu"');
    });
    test('createAssistant with empty assistant name', async () => {
        const assistantName = '';
        const throwError = async () => {
            await pinecone.createAssistant({
                name: assistantName,
            });
        };
        await expect(throwError()).rejects.toThrow('Invalid assistant name');
    });
    test('createAssistant with duplicate name', async () => {
        const assistantName = (0, test_helpers_1.randomString)(5);
        await pinecone.createAssistant({
            name: assistantName,
        });
        const throwError = async () => {
            await pinecone.createAssistant({
                name: assistantName,
            });
        };
        await expect(throwError()).rejects.toThrow();
        await pinecone.deleteAssistant(assistantName);
    });
});
//# sourceMappingURL=createAssistant.test.js.map