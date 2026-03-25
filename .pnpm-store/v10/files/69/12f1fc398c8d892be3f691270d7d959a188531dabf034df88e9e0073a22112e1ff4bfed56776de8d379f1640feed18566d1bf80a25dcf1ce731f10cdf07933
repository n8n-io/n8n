"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messages = exports.MessageStream = void 0;
const resource_1 = require("../resource.js");
const MessageStream_1 = require("../lib/MessageStream.js");
var MessageStream_2 = require("../lib/MessageStream.js");
Object.defineProperty(exports, "MessageStream", { enumerable: true, get: function () { return MessageStream_2.MessageStream; } });
class Messages extends resource_1.APIResource {
    create(body, options) {
        if (body.model in DEPRECATED_MODELS) {
            console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        }
        return this._client.post('/v1/messages', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            stream: body.stream ?? false,
        });
    }
    /**
     * Create a Message stream
     */
    stream(body, options) {
        return MessageStream_1.MessageStream.createMessage(this, body, options);
    }
}
exports.Messages = Messages;
const DEPRECATED_MODELS = {
    'claude-1.3': 'November 6th, 2024',
    'claude-1.3-100k': 'November 6th, 2024',
    'claude-instant-1.1': 'November 6th, 2024',
    'claude-instant-1.1-100k': 'November 6th, 2024',
    'claude-instant-1.2': 'November 6th, 2024',
};
(function (Messages) {
})(Messages = exports.Messages || (exports.Messages = {}));
//# sourceMappingURL=messages.js.map