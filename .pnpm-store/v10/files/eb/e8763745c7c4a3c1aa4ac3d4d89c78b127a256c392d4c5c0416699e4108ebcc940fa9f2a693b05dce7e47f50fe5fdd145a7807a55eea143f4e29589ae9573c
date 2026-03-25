"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_1 = require("../chat");
const chatCompletion_1 = require("../chatCompletion");
const assistant_data_1 = require("../../../pinecone-generated-ts-fetch/assistant_data");
describe(`chat validation tests`, () => {
    describe('messagesValidation', () => {
        test('converts string array to MessageModel array', () => {
            const input = {
                messages: ['Hello', 'How are you?'],
            };
            const expected = [
                { role: 'user', content: 'Hello' },
                { role: 'user', content: 'How are you?' },
            ];
            expect((0, chat_1.messagesValidation)(input)).toEqual(expected);
        });
        test('validates message objects with role and content', () => {
            const input = {
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!' },
                ],
            };
            expect((0, chat_1.messagesValidation)(input)).toEqual(input.messages);
        });
        test('throws error when role is missing', () => {
            const input = {
                // @ts-ignore
                messages: [{ content: 'Hello' }],
            };
            expect(() => (0, chat_1.messagesValidation)(input)).toThrow('Message object must have exactly two keys: "role" and "content"');
        });
        test('throws error when object has invalid keys', () => {
            const input = {
                // @ts-ignore
                messages: [{ role: 'user', content: 'Hello', extra: 'field' }],
            };
            expect(() => (0, chat_1.messagesValidation)(input)).toThrow('exactly two keys');
        });
    });
    describe('modelValidation', () => {
        test('returns default GPT-4 model when no model specified', () => {
            const input = {
                messages: ['Hello'],
            };
            expect((0, chat_1.modelValidation)(input)).toBe(assistant_data_1.ChatModelEnum.Gpt4o);
        });
        test('validates correct model string', () => {
            const input = {
                messages: ['Hello'],
                model: 'gpt-4o',
            };
            expect((0, chat_1.modelValidation)(input)).toBe(assistant_data_1.ChatModelEnum.Gpt4o);
        });
        test('throws error for invalid model', () => {
            const input = {
                messages: ['Hello'],
                model: 'invalid-model',
            };
            expect(() => (0, chat_1.modelValidation)(input)).toThrow('Invalid model specified');
        });
        test('throws error when no messages provided', async () => {
            const AsstDataOperationsProvider = {
                provideData: async () => new assistant_data_1.ManageAssistantsApi(),
            };
            const chatFn = (0, chat_1.chat)('test-assistant', AsstDataOperationsProvider);
            const chatCompletionFn = (0, chatCompletion_1.chatCompletion)('test-assistant', AsstDataOperationsProvider);
            const input = {};
            const inputCompletion = {};
            await expect(chatFn(input)).rejects.toThrow('You must pass an object with required properties (`messages`) to chat with an assistant.');
            await expect(chatCompletionFn(inputCompletion)).rejects.toThrow('You must pass an object with required properties (`messages`) to chat with an assistant.');
        });
    });
});
//# sourceMappingURL=chatValidation.test.js.map