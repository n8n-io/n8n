"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Completions = exports.ChatCompletionRunner = exports.ChatCompletionStream = exports.ParsingToolFunction = exports.ParsingFunction = exports.ChatCompletionStreamingRunner = void 0;
const resource_1 = require("../../../resource.js");
const ChatCompletionRunner_1 = require("../../../lib/ChatCompletionRunner.js");
const ChatCompletionStreamingRunner_1 = require("../../../lib/ChatCompletionStreamingRunner.js");
const ChatCompletionStream_1 = require("../../../lib/ChatCompletionStream.js");
const parser_1 = require("../../../lib/parser.js");
var ChatCompletionStreamingRunner_2 = require("../../../lib/ChatCompletionStreamingRunner.js");
Object.defineProperty(exports, "ChatCompletionStreamingRunner", { enumerable: true, get: function () { return ChatCompletionStreamingRunner_2.ChatCompletionStreamingRunner; } });
var RunnableFunction_1 = require("../../../lib/RunnableFunction.js");
Object.defineProperty(exports, "ParsingFunction", { enumerable: true, get: function () { return RunnableFunction_1.ParsingFunction; } });
Object.defineProperty(exports, "ParsingToolFunction", { enumerable: true, get: function () { return RunnableFunction_1.ParsingToolFunction; } });
var ChatCompletionStream_2 = require("../../../lib/ChatCompletionStream.js");
Object.defineProperty(exports, "ChatCompletionStream", { enumerable: true, get: function () { return ChatCompletionStream_2.ChatCompletionStream; } });
var ChatCompletionRunner_2 = require("../../../lib/ChatCompletionRunner.js");
Object.defineProperty(exports, "ChatCompletionRunner", { enumerable: true, get: function () { return ChatCompletionRunner_2.ChatCompletionRunner; } });
class Completions extends resource_1.APIResource {
    parse(body, options) {
        (0, parser_1.validateInputTools)(body.tools);
        return this._client.chat.completions
            .create(body, {
            ...options,
            headers: {
                ...options?.headers,
                'X-Stainless-Helper-Method': 'beta.chat.completions.parse',
            },
        })
            ._thenUnwrap((completion) => (0, parser_1.parseChatCompletion)(completion, body));
    }
    runFunctions(body, options) {
        if (body.stream) {
            return ChatCompletionStreamingRunner_1.ChatCompletionStreamingRunner.runFunctions(this._client, body, options);
        }
        return ChatCompletionRunner_1.ChatCompletionRunner.runFunctions(this._client, body, options);
    }
    runTools(body, options) {
        if (body.stream) {
            return ChatCompletionStreamingRunner_1.ChatCompletionStreamingRunner.runTools(this._client, body, options);
        }
        return ChatCompletionRunner_1.ChatCompletionRunner.runTools(this._client, body, options);
    }
    /**
     * Creates a chat completion stream
     */
    stream(body, options) {
        return ChatCompletionStream_1.ChatCompletionStream.createChatCompletion(this._client, body, options);
    }
}
exports.Completions = Completions;
//# sourceMappingURL=completions.js.map