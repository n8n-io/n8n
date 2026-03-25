// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../core/resource.mjs";
import { Page } from "../../../core/pagination.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { JSONLDecoder } from "../../../internal/decoders/jsonl.mjs";
import { AnthropicError } from "../../../error.mjs";
import { path } from "../../../internal/utils/path.mjs";
export class Batches extends APIResource {
    /**
     * Send a batch of Message creation requests.
     *
     * The Message Batches API can be used to process multiple Messages API requests at
     * once. Once a Message Batch is created, it begins processing immediately. Batches
     * can take up to 24 hours to complete.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.create({
     *     requests: [
     *       {
     *         custom_id: 'my-custom-id-1',
     *         params: {
     *           max_tokens: 1024,
     *           messages: [
     *             { content: 'Hello, world', role: 'user' },
     *           ],
     *           model: 'claude-sonnet-4-5-20250929',
     *         },
     *       },
     *     ],
     *   });
     * ```
     */
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/messages/batches?beta=true', {
            body,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * This endpoint is idempotent and can be used to poll for Message Batch
     * completion. To access the results of a Message Batch, make a request to the
     * `results_url` field in the response.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.retrieve(
     *     'message_batch_id',
     *   );
     * ```
     */
    retrieve(messageBatchID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.get(path `/v1/messages/batches/${messageBatchID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * List all Message Batches within a Workspace. Most recently created batches are
     * returned first.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const betaMessageBatch of client.beta.messages.batches.list()) {
     *   // ...
     * }
     * ```
     */
    list(params = {}, options) {
        const { betas, ...query } = params ?? {};
        return this._client.getAPIList('/v1/messages/batches?beta=true', (Page), {
            query,
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Delete a Message Batch.
     *
     * Message Batches can only be deleted once they've finished processing. If you'd
     * like to delete an in-progress batch, you must first cancel it.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaDeletedMessageBatch =
     *   await client.beta.messages.batches.delete(
     *     'message_batch_id',
     *   );
     * ```
     */
    delete(messageBatchID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.delete(path `/v1/messages/batches/${messageBatchID}?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Batches may be canceled any time before processing ends. Once cancellation is
     * initiated, the batch enters a `canceling` state, at which time the system may
     * complete any in-progress, non-interruptible requests before finalizing
     * cancellation.
     *
     * The number of canceled requests is specified in `request_counts`. To determine
     * which requests were canceled, check the individual results within the batch.
     * Note that cancellation may not result in any canceled requests if they were
     * non-interruptible.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatch =
     *   await client.beta.messages.batches.cancel(
     *     'message_batch_id',
     *   );
     * ```
     */
    cancel(messageBatchID, params = {}, options) {
        const { betas } = params ?? {};
        return this._client.post(path `/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
            ...options,
            headers: buildHeaders([
                { 'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString() },
                options?.headers,
            ]),
        });
    }
    /**
     * Streams the results of a Message Batch as a `.jsonl` file.
     *
     * Each line in the file is a JSON object containing the result of a single request
     * in the Message Batch. Results are not guaranteed to be in the same order as
     * requests. Use the `custom_id` field to match results to requests.
     *
     * Learn more about the Message Batches API in our
     * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
     *
     * @example
     * ```ts
     * const betaMessageBatchIndividualResponse =
     *   await client.beta.messages.batches.results(
     *     'message_batch_id',
     *   );
     * ```
     */
    async results(messageBatchID, params = {}, options) {
        const batch = await this.retrieve(messageBatchID);
        if (!batch.results_url) {
            throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
        }
        const { betas } = params ?? {};
        return this._client
            .get(batch.results_url, {
            ...options,
            headers: buildHeaders([
                {
                    'anthropic-beta': [...(betas ?? []), 'message-batches-2024-09-24'].toString(),
                    Accept: 'application/binary',
                },
                options?.headers,
            ]),
            stream: true,
            __binaryResponse: true,
        })
            ._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
    }
}
//# sourceMappingURL=batches.mjs.map