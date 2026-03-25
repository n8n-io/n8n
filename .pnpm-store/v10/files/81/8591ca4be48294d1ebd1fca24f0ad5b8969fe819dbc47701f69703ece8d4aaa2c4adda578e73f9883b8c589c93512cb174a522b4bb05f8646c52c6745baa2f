// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../core/resource.mjs";
import { MessageStream } from "../../lib/MessageStream.mjs";
import * as BatchesAPI from "./batches.mjs";
import { Batches, } from "./batches.mjs";
import { MODEL_NONSTREAMING_TOKENS } from "../../internal/constants.mjs";
export class Messages extends APIResource {
    constructor() {
        super(...arguments);
        this.batches = new BatchesAPI.Batches(this._client);
    }
    create(body, options) {
        if (body.model in DEPRECATED_MODELS) {
            console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        }
        let timeout = this._client._options.timeout;
        if (!body.stream && timeout == null) {
            const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
            timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
        }
        return this._client.post('/v1/messages', {
            body,
            timeout: timeout ?? 600000,
            ...options,
            stream: body.stream ?? false,
        });
    }
    /**
     * Create a Message stream
     */
    stream(body, options) {
        return MessageStream.createMessage(this, body, options);
    }
    /**
     * Count the number of tokens in a Message.
     *
     * The Token Count API can be used to count the number of tokens in a Message,
     * including tools, images, and documents, without creating it.
     *
     * Learn more about token counting in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
     *
     * @example
     * ```ts
     * const messageTokensCount =
     *   await client.messages.countTokens({
     *     messages: [{ content: 'string', role: 'user' }],
     *     model: 'claude-opus-4-5-20251101',
     *   });
     * ```
     */
    countTokens(body, options) {
        return this._client.post('/v1/messages/count_tokens', { body, ...options });
    }
}
const DEPRECATED_MODELS = {
    'claude-1.3': 'November 6th, 2024',
    'claude-1.3-100k': 'November 6th, 2024',
    'claude-instant-1.1': 'November 6th, 2024',
    'claude-instant-1.1-100k': 'November 6th, 2024',
    'claude-instant-1.2': 'November 6th, 2024',
    'claude-3-sonnet-20240229': 'July 21st, 2025',
    'claude-3-opus-20240229': 'January 5th, 2026',
    'claude-2.1': 'July 21st, 2025',
    'claude-2.0': 'July 21st, 2025',
    'claude-3-7-sonnet-latest': 'February 19th, 2026',
    'claude-3-7-sonnet-20250219': 'February 19th, 2026',
};
Messages.Batches = Batches;
//# sourceMappingURL=messages.mjs.map