"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelValidation = exports.messagesValidation = exports.validateChatOptions = exports.chat = void 0;
const assistant_data_1 = require("../../pinecone-generated-ts-fetch/assistant_data");
const utils_1 = require("../../utils");
const types_1 = require("./types");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const errors_1 = require("../../errors");
const chat = (assistantName, apiProvider) => {
    return async (options) => {
        (0, exports.validateChatOptions)(options);
        const api = await apiProvider.provideData();
        const messages = (0, exports.messagesValidation)(options);
        const model = (0, exports.modelValidation)(options);
        const request = {
            assistantName: assistantName,
            chat: {
                messages: messages,
                stream: false,
                model: model,
                filter: options.filter,
                jsonResponse: options.jsonResponse,
                includeHighlights: options.includeHighlights,
            },
        };
        const retryWrapper = new utils_1.RetryOnServerFailure(() => api.chatAssistant(request));
        return await retryWrapper.execute();
    };
};
exports.chat = chat;
const validateChatOptions = (options) => {
    if (!options || !options.messages) {
        throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`messages`) to chat with an assistant.');
    }
    (0, validateObjectProperties_1.ValidateObjectProperties)(options, types_1.ChatOptionsType);
    if (options.model) {
        if (!Object.values(assistant_data_1.ChatModelEnum).includes(options.model)) {
            throw new errors_1.PineconeArgumentError(`Invalid model: "${options.model}". Must be one of: ${Object.values(assistant_data_1.ChatModelEnum)
                .map((model) => `"${model}"`)
                .join(', ')}.`);
        }
    }
};
exports.validateChatOptions = validateChatOptions;
/**
 * Validates the messages passed to the Assistant.
 *
 * @param options - A {@link ChatRequest} object containing the messages to send to the Assistant.
 * @throws An Error `role` key is not one of `user` or `assistant`.
 * @throws An Error if the message object does not have exactly two keys: `role` and `content`.
 * @returns An array of {@link MessageModel} objects containing the messages to send to the Assistant.
 */
const messagesValidation = (options) => {
    let messages = [];
    // If messages are passed as a list of strings:
    if (options.messages && typeof options.messages[0] == 'string') {
        // role defaults to user if not specified
        messages = options.messages.map((message) => {
            return { role: 'user', content: message };
        });
    }
    // If messages are passed as a list of objects:
    if (Array.isArray(options.messages) &&
        typeof options.messages[0] === 'object') {
        if (options.messages[0]['role']) {
            if (options.messages[0]['role'].toLowerCase() !== 'user' &&
                options.messages[0]['role'].toLowerCase() !== 'assistant') {
                throw new Error('No role specified in message object. Must be one of "user" or "assistant"');
            }
        }
        // Extract unique keys from all messages
        const keys = Array.from(new Set(options.messages.flatMap((message) => Object.keys(message))));
        if (keys.length !== 2) {
            throw new Error('Message object must have exactly two keys: "role" and "content"');
        }
        // Cast messages after validating keys
        return (messages = options.messages);
    }
    return messages;
};
exports.messagesValidation = messagesValidation;
/**
 * Validates the model passed to the Assistant.
 *
 * @param options - A {@link ChatRequest} object containing the model to use for the Assistant.
 * @throws An Error if the model is not one of the available models as outlined in {@link ChatModelEnum}.
 */
const modelValidation = (options) => {
    // Make sure passed string for 'model' matches one of the Enum values; default to Gpt4o
    let model = assistant_data_1.ChatModelEnum.Gpt4o;
    if (options.model) {
        if (!Object.values(assistant_data_1.ChatModelEnum).toString().includes(options.model)) {
            throw new Error('Invalid model specified. Must be one of "gpt-4o" or "claude-3-5-sonnet"');
        }
        else {
            model = options.model;
        }
    }
    return model;
};
exports.modelValidation = modelValidation;
//# sourceMappingURL=chat.js.map