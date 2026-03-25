"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletionStream = void 0;
const assistant_data_1 = require("../../pinecone-generated-ts-fetch/assistant_data");
const utils_1 = require("../../utils");
const errors_1 = require("../../errors");
const node_stream_1 = require("node:stream");
const chat_1 = require("./chat");
const chatCompletionStream = (assistantName, apiProvider, config) => {
    return async (options) => {
        const fetch = (0, utils_1.getFetch)(config);
        (0, chat_1.validateChatOptions)(options);
        const hostUrl = await apiProvider.provideHostUrl();
        const chatUrl = `${hostUrl}/chat/${assistantName}/chat/completions`;
        const requestHeaders = {
            'Api-Key': config.apiKey,
            'User-Agent': (0, utils_1.buildUserAgent)(config),
            'X-Pinecone-Api-Version': assistant_data_1.X_PINECONE_API_VERSION,
        };
        const response = await fetch(chatUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({
                messages: (0, chat_1.messagesValidation)(options),
                stream: true,
                model: (0, chat_1.modelValidation)(options),
                filter: options.filter,
            }),
        });
        if (response.ok && response.body) {
            const nodeReadable = node_stream_1.Readable.fromWeb(response.body);
            return new utils_1.ChatStream(nodeReadable);
        }
        else {
            const err = await (0, errors_1.handleApiError)(new assistant_data_1.ResponseError(response, 'Response returned an error'), undefined, chatUrl);
            throw err;
        }
    };
};
exports.chatCompletionStream = chatCompletionStream;
//# sourceMappingURL=chatCompletionStream.js.map