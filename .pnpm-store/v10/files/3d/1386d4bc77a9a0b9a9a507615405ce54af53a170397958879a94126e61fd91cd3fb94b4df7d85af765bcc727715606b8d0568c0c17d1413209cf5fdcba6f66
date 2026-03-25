"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messages = void 0;
const resource_1 = require("../../../resource.js");
const PromptCachingBetaMessageStream_1 = require("../../../lib/PromptCachingBetaMessageStream.js");
class Messages extends resource_1.APIResource {
    create(body, options) {
        return this._client.post('/v1/messages?beta=prompt_caching', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            headers: { 'anthropic-beta': 'prompt-caching-2024-07-31', ...options?.headers },
            stream: body.stream ?? false,
        });
    }
    /**
     * Create a Message stream
     */
    stream(body, options) {
        return PromptCachingBetaMessageStream_1.PromptCachingBetaMessageStream.createMessage(this, body, options);
    }
}
exports.Messages = Messages;
(function (Messages) {
})(Messages = exports.Messages || (exports.Messages = {}));
//# sourceMappingURL=messages.js.map