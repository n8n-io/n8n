"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../../pinecone");
let pinecone;
let assistant;
let assistantName;
if (!process.env.ASSISTANT_NAME) {
    throw new Error('ASSISTANT_NAME environment variable is not set');
}
else {
    assistantName = process.env.ASSISTANT_NAME;
}
beforeAll(async () => {
    pinecone = new pinecone_1.Pinecone();
    assistant = pinecone.Assistant(assistantName);
});
describe('non-streaming chat success paths', () => {
    test('chat', async () => {
        let response;
        try {
            response = await assistant.chat({
                messages: [{ role: 'user', content: 'Hello' }],
            });
        }
        catch (error) {
            const errorResponse = error;
            if (errorResponse.name == 'PineconeBadRequestError') {
                console.log('Assistant not ready to chat yet, trying again ', errorResponse.message);
                response = await assistant.chat({
                    messages: [{ role: 'user', content: 'Hello' }],
                });
            }
            else {
                throw error;
            }
        }
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
        expect(response.id).toBeDefined();
        expect(response.model).toBeDefined();
        expect(response.usage).toBeDefined();
        expect(response.finishReason).toBeDefined();
    });
    test('chatCompletion', async () => {
        let response;
        try {
            response = await assistant.chatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
            });
        }
        catch (error) {
            const errorResponse = error;
            if (errorResponse.name == 'PineconeBadRequestError') {
                console.log('Assistant not ready to chat yet, trying again ', errorResponse.message);
                response = await assistant.chatCompletion({
                    messages: [{ role: 'user', content: 'Hello' }],
                });
            }
            else {
                throw error;
            }
        }
        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
        expect(response.model).toBeDefined();
        expect(response.usage).toBeDefined();
        expect(response.choices).toBeDefined();
    });
});
describe('streaming chat success paths', () => {
    test('chatStream', async () => {
        let response;
        try {
            response = await assistant.chatStream({
                messages: [{ role: 'user', content: 'Hello' }],
            });
        }
        catch (error) {
            const errorResponse = error;
            if (errorResponse.name == 'PineconeBadRequestError') {
                console.log('Assistant not ready to chat yet, trying again ', errorResponse.message);
                response = await assistant.chatStream({
                    messages: [{ role: 'user', content: 'Hello' }],
                });
            }
            else {
                throw error;
            }
        }
        // stream response and validate
        expect(response).toBeDefined();
        for await (const chatMessage of response) {
            expect(chatMessage).toBeDefined();
            expect(chatMessage.id).toBeDefined();
            expect(chatMessage.model).toBeDefined();
            expect(chatMessage.type).toBeDefined();
            if (chatMessage.type === 'message_start') {
                expect(chatMessage.role).toBeDefined();
            }
            else if (chatMessage.type === 'content_chunk') {
                expect(chatMessage.delta).toBeDefined();
            }
            else if (chatMessage.type === 'citation') {
                expect(chatMessage.citation).toBeDefined();
            }
            else if (chatMessage.type === 'message_end') {
                expect(chatMessage.finishReason).toBeDefined();
                expect(chatMessage.usage).toBeDefined();
            }
        }
    });
    test('chatCompletionStream', async () => {
        let response;
        try {
            response = await assistant.chatCompletionStream({
                messages: [{ role: 'user', content: 'Hello' }],
            });
        }
        catch (error) {
            const errorResponse = error;
            if (errorResponse.name == 'PineconeBadRequestError') {
                console.log('Assistant not ready to chat yet, trying again ', errorResponse.message);
                response = await assistant.chatCompletionStream({
                    messages: [{ role: 'user', content: 'Hello' }],
                });
            }
            else {
                throw error;
            }
        }
        // stream response and validate
        expect(response).toBeDefined();
        for await (const chatMessage of response) {
            expect(chatMessage).toBeDefined();
            expect(chatMessage.id).toBeDefined();
            expect(chatMessage.model).toBeDefined();
            expect(chatMessage.choices).toBeDefined();
        }
    });
});
describe('Chat error paths', () => {
    const chatMethods = [
        'chat',
        'chatStream',
        'chatCompletion',
        'chatCompletionStream',
    ];
    test.each(chatMethods)('%s with empty messages', async (method) => {
        const throwError = async () => {
            await assistant[method]({ messages: [] });
        };
        await expect(throwError()).rejects.toThrow('Must have at least 1 message');
    });
    test.each(chatMethods)('%s with invalid role type', async (method) => {
        const throwError = async () => {
            await assistant[method]({
                messages: [{ role: 'invalid', content: 'Hello' }],
            });
        };
        await expect(throwError()).rejects.toThrow('No role specified in message object. Must be one of "user" or "assistant"');
    });
    test.each(chatMethods)('%s with no role key', async (method) => {
        const throwError = async () => {
            await assistant[method]({
                messages: [{}],
            });
        };
        await expect(throwError()).rejects.toThrow('Message object must have exactly two keys: "role" and "content"');
    });
    test.each(chatMethods)('%s with invalid model', async (method) => {
        const throwError = async () => {
            await assistant[method]({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'invalid',
            });
        };
        await expect(throwError()).rejects.toThrow('Invalid model: "invalid". Must be one of: "gpt-4o", "claude-3-5-sonnet"');
    });
    test.each(chatMethods)('%s with nonexistent assistant', async (method) => {
        const throwError = async () => {
            await pinecone.Assistant('nonexistent')[method]({
                messages: [{ role: 'user', content: 'Hello' }],
            });
        };
        await expect(throwError()).rejects.toThrow('A call to https://api.pinecone.io/assistant/assistants/nonexistent returned HTTP status 404.');
    });
});
//# sourceMappingURL=chat.test.js.map