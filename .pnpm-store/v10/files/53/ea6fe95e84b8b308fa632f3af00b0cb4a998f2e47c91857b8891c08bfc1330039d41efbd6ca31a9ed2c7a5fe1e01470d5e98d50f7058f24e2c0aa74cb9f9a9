"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = void 0;
const chat_1 = require("./chat");
const utils_1 = require("../../utils");
const chatCompletion = (assistantName, apiProvider) => {
    return async (options) => {
        (0, chat_1.validateChatOptions)(options);
        const api = await apiProvider.provideData();
        const messages = (0, chat_1.messagesValidation)(options);
        const model = (0, chat_1.modelValidation)(options);
        const request = {
            assistantName: assistantName,
            searchCompletions: {
                messages: messages,
                stream: false,
                model: model,
                filter: options.filter,
            },
        };
        const retryWrapper = new utils_1.RetryOnServerFailure(() => api.chatCompletionAssistant(request));
        return await retryWrapper.execute();
    };
};
exports.chatCompletion = chatCompletion;
//# sourceMappingURL=chatCompletion.js.map