import { APIResource } from "../../../core/resource.mjs";
import * as BetaAPI from "../beta.mjs";
import { APIPromise } from "../../../core/api-promise.mjs";
import * as BetaMessagesAPI from "./messages.mjs";
import { Page, type PageParams, PagePromise } from "../../../core/pagination.mjs";
import { RequestOptions } from "../../../internal/request-options.mjs";
import { JSONLDecoder } from "../../../internal/decoders/jsonl.mjs";
import * as MessagesApi from "../../messages/messages.mjs";
export declare class Batches extends APIResource {
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
    create(params: BatchCreateParams, options?: RequestOptions): APIPromise<BetaMessageBatch>;
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
    retrieve(messageBatchID: string, params?: BatchRetrieveParams | null | undefined, options?: RequestOptions): APIPromise<BetaMessageBatch>;
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
    list(params?: BatchListParams | null | undefined, options?: RequestOptions): PagePromise<BetaMessageBatchesPage, BetaMessageBatch>;
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
    delete(messageBatchID: string, params?: BatchDeleteParams | null | undefined, options?: RequestOptions): APIPromise<BetaDeletedMessageBatch>;
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
    cancel(messageBatchID: string, params?: BatchCancelParams | null | undefined, options?: RequestOptions): APIPromise<BetaMessageBatch>;
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
    results(messageBatchID: string, params?: BatchResultsParams | undefined, options?: RequestOptions): Promise<JSONLDecoder<BetaMessageBatchIndividualResponse>>;
}
export type BetaMessageBatchesPage = Page<BetaMessageBatch>;
export interface BetaDeletedMessageBatch {
    /**
     * ID of the Message Batch.
     */
    id: string;
    /**
     * Deleted object type.
     *
     * For Message Batches, this is always `"message_batch_deleted"`.
     */
    type: 'message_batch_deleted';
}
export interface BetaMessageBatch {
    /**
     * Unique object identifier.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * RFC 3339 datetime string representing the time at which the Message Batch was
     * archived and its results became unavailable.
     */
    archived_at: string | null;
    /**
     * RFC 3339 datetime string representing the time at which cancellation was
     * initiated for the Message Batch. Specified only if cancellation was initiated.
     */
    cancel_initiated_at: string | null;
    /**
     * RFC 3339 datetime string representing the time at which the Message Batch was
     * created.
     */
    created_at: string;
    /**
     * RFC 3339 datetime string representing the time at which processing for the
     * Message Batch ended. Specified only once processing ends.
     *
     * Processing ends when every request in a Message Batch has either succeeded,
     * errored, canceled, or expired.
     */
    ended_at: string | null;
    /**
     * RFC 3339 datetime string representing the time at which the Message Batch will
     * expire and end processing, which is 24 hours after creation.
     */
    expires_at: string;
    /**
     * Processing status of the Message Batch.
     */
    processing_status: 'in_progress' | 'canceling' | 'ended';
    /**
     * Tallies requests within the Message Batch, categorized by their status.
     *
     * Requests start as `processing` and move to one of the other statuses only once
     * processing of the entire batch ends. The sum of all values always matches the
     * total number of requests in the batch.
     */
    request_counts: BetaMessageBatchRequestCounts;
    /**
     * URL to a `.jsonl` file containing the results of the Message Batch requests.
     * Specified only once processing ends.
     *
     * Results in the file are not guaranteed to be in the same order as requests. Use
     * the `custom_id` field to match results to requests.
     */
    results_url: string | null;
    /**
     * Object type.
     *
     * For Message Batches, this is always `"message_batch"`.
     */
    type: 'message_batch';
}
export interface BetaMessageBatchCanceledResult {
    type: 'canceled';
}
export interface BetaMessageBatchErroredResult {
    error: BetaAPI.BetaErrorResponse;
    type: 'errored';
}
export interface BetaMessageBatchExpiredResult {
    type: 'expired';
}
/**
 * This is a single line in the response `.jsonl` file and does not represent the
 * response as a whole.
 */
export interface BetaMessageBatchIndividualResponse {
    /**
     * Developer-provided ID created for each request in a Message Batch. Useful for
     * matching results to requests, as results may be given out of request order.
     *
     * Must be unique for each request within the Message Batch.
     */
    custom_id: string;
    /**
     * Processing result for this request.
     *
     * Contains a Message output if processing was successful, an error response if
     * processing failed, or the reason why processing was not attempted, such as
     * cancellation or expiration.
     */
    result: BetaMessageBatchResult;
}
export interface BetaMessageBatchRequestCounts {
    /**
     * Number of requests in the Message Batch that have been canceled.
     *
     * This is zero until processing of the entire Message Batch has ended.
     */
    canceled: number;
    /**
     * Number of requests in the Message Batch that encountered an error.
     *
     * This is zero until processing of the entire Message Batch has ended.
     */
    errored: number;
    /**
     * Number of requests in the Message Batch that have expired.
     *
     * This is zero until processing of the entire Message Batch has ended.
     */
    expired: number;
    /**
     * Number of requests in the Message Batch that are processing.
     */
    processing: number;
    /**
     * Number of requests in the Message Batch that have completed successfully.
     *
     * This is zero until processing of the entire Message Batch has ended.
     */
    succeeded: number;
}
/**
 * Processing result for this request.
 *
 * Contains a Message output if processing was successful, an error response if
 * processing failed, or the reason why processing was not attempted, such as
 * cancellation or expiration.
 */
export type BetaMessageBatchResult = BetaMessageBatchSucceededResult | BetaMessageBatchErroredResult | BetaMessageBatchCanceledResult | BetaMessageBatchExpiredResult;
export interface BetaMessageBatchSucceededResult {
    message: BetaMessagesAPI.BetaMessage;
    type: 'succeeded';
}
export interface BatchCreateParams {
    /**
     * Body param: List of requests for prompt completion. Each is an individual
     * request to create a Message.
     */
    requests: Array<BatchCreateParams.Request>;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace BatchCreateParams {
    interface Request {
        /**
         * Developer-provided ID created for each request in a Message Batch. Useful for
         * matching results to requests, as results may be given out of request order.
         *
         * Must be unique for each request within the Message Batch.
         */
        custom_id: string;
        /**
         * Messages API creation parameters for the individual request.
         *
         * See the [Messages API reference](https://docs.claude.com/en/api/messages) for
         * full documentation on available parameters.
         */
        params: Request.Params;
    }
    namespace Request {
        /**
         * Messages API creation parameters for the individual request.
         *
         * See the [Messages API reference](https://docs.claude.com/en/api/messages) for
         * full documentation on available parameters.
         */
        interface Params {
            /**
             * The maximum number of tokens to generate before stopping.
             *
             * Note that our models may stop _before_ reaching this maximum. This parameter
             * only specifies the absolute maximum number of tokens to generate.
             *
             * Different models have different maximum values for this parameter. See
             * [models](https://docs.claude.com/en/docs/models-overview) for details.
             */
            max_tokens: number;
            /**
             * Input messages.
             *
             * Our models are trained to operate on alternating `user` and `assistant`
             * conversational turns. When creating a new `Message`, you specify the prior
             * conversational turns with the `messages` parameter, and the model then generates
             * the next `Message` in the conversation. Consecutive `user` or `assistant` turns
             * in your request will be combined into a single turn.
             *
             * Each input message must be an object with a `role` and `content`. You can
             * specify a single `user`-role message, or you can include multiple `user` and
             * `assistant` messages.
             *
             * If the final message uses the `assistant` role, the response content will
             * continue immediately from the content in that message. This can be used to
             * constrain part of the model's response.
             *
             * Example with a single `user` message:
             *
             * ```json
             * [{ "role": "user", "content": "Hello, Claude" }]
             * ```
             *
             * Example with multiple conversational turns:
             *
             * ```json
             * [
             *   { "role": "user", "content": "Hello there." },
             *   { "role": "assistant", "content": "Hi, I'm Claude. How can I help you?" },
             *   { "role": "user", "content": "Can you explain LLMs in plain English?" }
             * ]
             * ```
             *
             * Example with a partially-filled response from Claude:
             *
             * ```json
             * [
             *   {
             *     "role": "user",
             *     "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"
             *   },
             *   { "role": "assistant", "content": "The best answer is (" }
             * ]
             * ```
             *
             * Each input message `content` may be either a single `string` or an array of
             * content blocks, where each block has a specific `type`. Using a `string` for
             * `content` is shorthand for an array of one content block of type `"text"`. The
             * following input messages are equivalent:
             *
             * ```json
             * { "role": "user", "content": "Hello, Claude" }
             * ```
             *
             * ```json
             * { "role": "user", "content": [{ "type": "text", "text": "Hello, Claude" }] }
             * ```
             *
             * See [input examples](https://docs.claude.com/en/api/messages-examples).
             *
             * Note that if you want to include a
             * [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the
             * top-level `system` parameter — there is no `"system"` role for input messages in
             * the Messages API.
             *
             * There is a limit of 100,000 messages in a single request.
             */
            messages: Array<BetaMessagesAPI.BetaMessageParam>;
            /**
             * The model that will complete your prompt.\n\nSee
             * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
             * details and options.
             */
            model: MessagesApi.Model;
            /**
             * Container identifier for reuse across requests.
             */
            container?: BetaMessagesAPI.BetaContainerParams | string | null;
            /**
             * Context management configuration.
             *
             * This allows you to control how Claude manages context across multiple requests,
             * such as whether to clear function results or not.
             */
            context_management?: BetaMessagesAPI.BetaContextManagementConfig | null;
            /**
             * MCP servers to be utilized in this request
             */
            mcp_servers?: Array<BetaMessagesAPI.BetaRequestMCPServerURLDefinition>;
            /**
             * An object describing metadata about the request.
             */
            metadata?: BetaMessagesAPI.BetaMetadata;
            /**
             * Configuration options for the model's output. Controls aspects like how much
             * effort the model puts into its response.
             */
            output_config?: BetaMessagesAPI.BetaOutputConfig;
            /**
             * A schema to specify Claude's output format in responses.
             */
            output_format?: BetaMessagesAPI.BetaJSONOutputFormat | null;
            /**
             * Determines whether to use priority capacity (if available) or standard capacity
             * for this request.
             *
             * Anthropic offers different levels of service for your API requests. See
             * [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
             */
            service_tier?: 'auto' | 'standard_only';
            /**
             * Custom text sequences that will cause the model to stop generating.
             *
             * Our models will normally stop when they have naturally completed their turn,
             * which will result in a response `stop_reason` of `"end_turn"`.
             *
             * If you want the model to stop generating when it encounters custom strings of
             * text, you can use the `stop_sequences` parameter. If the model encounters one of
             * the custom sequences, the response `stop_reason` value will be `"stop_sequence"`
             * and the response `stop_sequence` value will contain the matched stop sequence.
             */
            stop_sequences?: Array<string>;
            /**
             * Whether to incrementally stream the response using server-sent events.
             *
             * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
             */
            stream?: boolean;
            /**
             * System prompt.
             *
             * A system prompt is a way of providing context and instructions to Claude, such
             * as specifying a particular goal or role. See our
             * [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
             */
            system?: string | Array<BetaMessagesAPI.BetaTextBlockParam>;
            /**
             * Amount of randomness injected into the response.
             *
             * Defaults to `1.0`. Ranges from `0.0` to `1.0`. Use `temperature` closer to `0.0`
             * for analytical / multiple choice, and closer to `1.0` for creative and
             * generative tasks.
             *
             * Note that even with `temperature` of `0.0`, the results will not be fully
             * deterministic.
             */
            temperature?: number;
            /**
             * Configuration for enabling Claude's extended thinking.
             *
             * When enabled, responses include `thinking` content blocks showing Claude's
             * thinking process before the final answer. Requires a minimum budget of 1,024
             * tokens and counts towards your `max_tokens` limit.
             *
             * See
             * [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
             * for details.
             */
            thinking?: BetaMessagesAPI.BetaThinkingConfigParam;
            /**
             * How the model should use the provided tools. The model can use a specific tool,
             * any available tool, decide by itself, or not use tools at all.
             */
            tool_choice?: BetaMessagesAPI.BetaToolChoice;
            /**
             * Definitions of tools that the model may use.
             *
             * If you include `tools` in your API request, the model may return `tool_use`
             * content blocks that represent the model's use of those tools. You can then run
             * those tools using the tool input generated by the model and then optionally
             * return results back to the model using `tool_result` content blocks.
             *
             * There are two types of tools: **client tools** and **server tools**. The
             * behavior described below applies to client tools. For
             * [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview#server-tools),
             * see their individual documentation as each has its own behavior (e.g., the
             * [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).
             *
             * Each tool definition includes:
             *
             * - `name`: Name of the tool.
             * - `description`: Optional, but strongly-recommended description of the tool.
             * - `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the
             *   tool `input` shape that the model will produce in `tool_use` output content
             *   blocks.
             *
             * For example, if you defined `tools` as:
             *
             * ```json
             * [
             *   {
             *     "name": "get_stock_price",
             *     "description": "Get the current stock price for a given ticker symbol.",
             *     "input_schema": {
             *       "type": "object",
             *       "properties": {
             *         "ticker": {
             *           "type": "string",
             *           "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
             *         }
             *       },
             *       "required": ["ticker"]
             *     }
             *   }
             * ]
             * ```
             *
             * And then asked the model "What's the S&P 500 at today?", the model might produce
             * `tool_use` content blocks in the response like this:
             *
             * ```json
             * [
             *   {
             *     "type": "tool_use",
             *     "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
             *     "name": "get_stock_price",
             *     "input": { "ticker": "^GSPC" }
             *   }
             * ]
             * ```
             *
             * You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an
             * input, and return the following back to the model in a subsequent `user`
             * message:
             *
             * ```json
             * [
             *   {
             *     "type": "tool_result",
             *     "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
             *     "content": "259.75 USD"
             *   }
             * ]
             * ```
             *
             * Tools can be used for workflows that include running client-side tools and
             * functions, or more generally whenever you want the model to produce a particular
             * JSON structure of output.
             *
             * See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.
             */
            tools?: Array<BetaMessagesAPI.BetaToolUnion>;
            /**
             * Only sample from the top K options for each subsequent token.
             *
             * Used to remove "long tail" low probability responses.
             * [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).
             *
             * Recommended for advanced use cases only. You usually only need to use
             * `temperature`.
             */
            top_k?: number;
            /**
             * Use nucleus sampling.
             *
             * In nucleus sampling, we compute the cumulative distribution over all the options
             * for each subsequent token in decreasing probability order and cut it off once it
             * reaches a particular probability specified by `top_p`. You should either alter
             * `temperature` or `top_p`, but not both.
             *
             * Recommended for advanced use cases only. You usually only need to use
             * `temperature`.
             */
            top_p?: number;
        }
    }
}
export interface BatchRetrieveParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface BatchListParams extends PageParams {
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface BatchDeleteParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface BatchCancelParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export interface BatchResultsParams {
    /**
     * Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace Batches {
    export { type BetaDeletedMessageBatch as BetaDeletedMessageBatch, type BetaMessageBatch as BetaMessageBatch, type BetaMessageBatchCanceledResult as BetaMessageBatchCanceledResult, type BetaMessageBatchErroredResult as BetaMessageBatchErroredResult, type BetaMessageBatchExpiredResult as BetaMessageBatchExpiredResult, type BetaMessageBatchIndividualResponse as BetaMessageBatchIndividualResponse, type BetaMessageBatchRequestCounts as BetaMessageBatchRequestCounts, type BetaMessageBatchResult as BetaMessageBatchResult, type BetaMessageBatchSucceededResult as BetaMessageBatchSucceededResult, type BetaMessageBatchesPage as BetaMessageBatchesPage, type BatchCreateParams as BatchCreateParams, type BatchRetrieveParams as BatchRetrieveParams, type BatchListParams as BatchListParams, type BatchDeleteParams as BatchDeleteParams, type BatchCancelParams as BatchCancelParams, type BatchResultsParams as BatchResultsParams, };
}
//# sourceMappingURL=batches.d.mts.map