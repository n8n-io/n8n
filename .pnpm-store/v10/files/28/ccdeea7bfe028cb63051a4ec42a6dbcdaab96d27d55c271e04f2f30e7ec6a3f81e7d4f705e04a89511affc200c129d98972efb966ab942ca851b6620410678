// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../core/resource.mjs";
import { MODEL_NONSTREAMING_TOKENS } from "../../../internal/constants.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseBetaMessage, } from "../../../lib/beta-parser.mjs";
import { BetaMessageStream } from "../../../lib/BetaMessageStream.mjs";
import { BetaToolRunner, } from "../../../lib/tools/BetaToolRunner.mjs";
import * as BatchesAPI from "./batches.mjs";
import { Batches, } from "./batches.mjs";
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
export class Messages extends APIResource {
    constructor() {
        super(...arguments);
        this.batches = new BatchesAPI.Batches(this._client);
    }
    create(params, options) {
        const { betas, ...body } = params;
        if (body.model in DEPRECATED_MODELS) {
            console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        }
        let timeout = this._client._options.timeout;
        if (!body.stream && timeout == null) {
            const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
            timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
        }
        return this._client.post('/v1/messages?beta=true', {
            body,
            timeout: timeout ?? 600000,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            stream: params.stream ?? false,
        });
    }
    /**
     * Send a structured list of input messages with text and/or image content, along with an expected `output_format` and
     * the response will be automatically parsed and available in the `parsed_output` property of the message.
     *
     * @example
     * ```ts
     * const message = await client.beta.messages.parse({
     *   model: 'claude-3-5-sonnet-20241022',
     *   max_tokens: 1024,
     *   messages: [{ role: 'user', content: 'What is 2+2?' }],
     *   output_format: zodOutputFormat(z.object({ answer: z.number() }), 'math'),
     * });
     *
     * console.log(message.parsed_output?.answer); // 4
     * ```
     */
    parse(params, options) {
        options = {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(params.betas ?? []), 'structured-outputs-2025-11-13'].toString() },
                options?.headers,
            ]),
        };
        return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
    }
    /**
     * Create a Message stream
     */
    stream(body, options) {
        return BetaMessageStream.createMessage(this, body, options);
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
     * const betaMessageTokensCount =
     *   await client.beta.messages.countTokens({
     *     messages: [{ content: 'string', role: 'user' }],
     *     model: 'claude-opus-4-5-20251101',
     *   });
     * ```
     */
    countTokens(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/messages/count_tokens?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'token-counting-2024-11-01'].toString() },
                options?.headers,
            ]),
        });
    }
    toolRunner(body, options) {
        return new BetaToolRunner(this._client, body, options);
    }
}
export { BetaToolRunner } from "../../../lib/tools/BetaToolRunner.mjs";
Messages.Batches = Batches;
Messages.BetaToolRunner = BetaToolRunner;
//# sourceMappingURL=messages.mjs.map