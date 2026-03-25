// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../resource.mjs";
import { PromptCachingBetaMessageStream } from "../../../lib/PromptCachingBetaMessageStream.mjs";
export class Messages extends APIResource {
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
        return PromptCachingBetaMessageStream.createMessage(this, body, options);
    }
}
(function (Messages) {
})(Messages || (Messages = {}));
//# sourceMappingURL=messages.mjs.map