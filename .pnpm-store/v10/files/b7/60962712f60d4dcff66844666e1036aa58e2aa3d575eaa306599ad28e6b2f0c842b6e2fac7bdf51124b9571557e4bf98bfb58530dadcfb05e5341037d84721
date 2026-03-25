// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIPromise } from '../../core/api-promise';
import { APIResource } from '../../core/resource';
import { Stream } from '../../core/streaming';
import { RequestOptions } from '../../internal/request-options';
import { MessageStream } from '../../lib/MessageStream';
import * as BatchesAPI from './batches';
import {
  BatchCreateParams,
  BatchListParams,
  Batches,
  DeletedMessageBatch,
  MessageBatch,
  MessageBatchCanceledResult,
  MessageBatchErroredResult,
  MessageBatchExpiredResult,
  MessageBatchIndividualResponse,
  MessageBatchRequestCounts,
  MessageBatchResult,
  MessageBatchSucceededResult,
  MessageBatchesPage,
} from './batches';
import * as MessagesAPI from './messages';

import { MODEL_NONSTREAMING_TOKENS } from '../../internal/constants';

export class Messages extends APIResource {
  batches: BatchesAPI.Batches = new BatchesAPI.Batches(this._client);

  /**
   * Send a structured list of input messages with text and/or image content, and the
   * model will generate the next message in the conversation.
   *
   * The Messages API can be used for either single queries or stateless multi-turn
   * conversations.
   *
   * Learn more about the Messages API in our
   * [user guide](https://docs.claude.com/en/docs/initial-setup)
   *
   * @example
   * ```ts
   * const message = await client.messages.create({
   *   max_tokens: 1024,
   *   messages: [{ content: 'Hello, world', role: 'user' }],
   *   model: 'claude-sonnet-4-5-20250929',
   * });
   * ```
   */
  create(body: MessageCreateParamsNonStreaming, options?: RequestOptions): APIPromise<Message>;
  create(
    body: MessageCreateParamsStreaming,
    options?: RequestOptions,
  ): APIPromise<Stream<RawMessageStreamEvent>>;
  create(
    body: MessageCreateParamsBase,
    options?: RequestOptions,
  ): APIPromise<Stream<RawMessageStreamEvent> | Message>;
  create(
    body: MessageCreateParams,
    options?: RequestOptions,
  ): APIPromise<Message> | APIPromise<Stream<RawMessageStreamEvent>> {
    if (body.model in DEPRECATED_MODELS) {
      console.warn(
        `The model '${body.model}' is deprecated and will reach end-of-life on ${
          DEPRECATED_MODELS[body.model]
        }\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`,
      );
    }
    let timeout = (this._client as any)._options.timeout as number | null;
    if (!body.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
      timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post('/v1/messages', {
      body,
      timeout: timeout ?? 600000,
      ...options,
      stream: body.stream ?? false,
    }) as APIPromise<Message> | APIPromise<Stream<RawMessageStreamEvent>>;
  }

  /**
   * Create a Message stream
   */
  stream(body: MessageStreamParams, options?: RequestOptions): MessageStream {
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
  countTokens(body: MessageCountTokensParams, options?: RequestOptions): APIPromise<MessageTokensCount> {
    return this._client.post('/v1/messages/count_tokens', { body, ...options });
  }
}

export interface Base64ImageSource {
  data: string;

  media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  type: 'base64';
}

export interface Base64PDFSource {
  data: string;

  media_type: 'application/pdf';

  type: 'base64';
}

export interface CacheControlEphemeral {
  type: 'ephemeral';

  /**
   * The time-to-live for the cache control breakpoint.
   *
   * This may be one the following values:
   *
   * - `5m`: 5 minutes
   * - `1h`: 1 hour
   *
   * Defaults to `5m`.
   */
  ttl?: '5m' | '1h';
}

export interface CacheCreation {
  /**
   * The number of input tokens used to create the 1 hour cache entry.
   */
  ephemeral_1h_input_tokens: number;

  /**
   * The number of input tokens used to create the 5 minute cache entry.
   */
  ephemeral_5m_input_tokens: number;
}

export interface CitationCharLocation {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_char_index: number;

  file_id: string | null;

  start_char_index: number;

  type: 'char_location';
}

export interface CitationCharLocationParam {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_char_index: number;

  start_char_index: number;

  type: 'char_location';
}

export interface CitationContentBlockLocation {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_block_index: number;

  file_id: string | null;

  start_block_index: number;

  type: 'content_block_location';
}

export interface CitationContentBlockLocationParam {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_block_index: number;

  start_block_index: number;

  type: 'content_block_location';
}

export interface CitationPageLocation {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_page_number: number;

  file_id: string | null;

  start_page_number: number;

  type: 'page_location';
}

export interface CitationPageLocationParam {
  cited_text: string;

  document_index: number;

  document_title: string | null;

  end_page_number: number;

  start_page_number: number;

  type: 'page_location';
}

export interface CitationSearchResultLocationParam {
  cited_text: string;

  end_block_index: number;

  search_result_index: number;

  source: string;

  start_block_index: number;

  title: string | null;

  type: 'search_result_location';
}

export interface CitationWebSearchResultLocationParam {
  cited_text: string;

  encrypted_index: string;

  title: string | null;

  type: 'web_search_result_location';

  url: string;
}

export interface CitationsConfigParam {
  enabled?: boolean;
}

export interface CitationsDelta {
  citation:
    | CitationCharLocation
    | CitationPageLocation
    | CitationContentBlockLocation
    | CitationsWebSearchResultLocation
    | CitationsSearchResultLocation;

  type: 'citations_delta';
}

export interface CitationsSearchResultLocation {
  cited_text: string;

  end_block_index: number;

  search_result_index: number;

  source: string;

  start_block_index: number;

  title: string | null;

  type: 'search_result_location';
}

export interface CitationsWebSearchResultLocation {
  cited_text: string;

  encrypted_index: string;

  title: string | null;

  type: 'web_search_result_location';

  url: string;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | RedactedThinkingBlock
  | ToolUseBlock
  | ServerToolUseBlock
  | WebSearchToolResultBlock;

/**
 * Regular text content.
 */
export type ContentBlockParam =
  | TextBlockParam
  | ImageBlockParam
  | DocumentBlockParam
  | SearchResultBlockParam
  | ThinkingBlockParam
  | RedactedThinkingBlockParam
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ServerToolUseBlockParam
  | WebSearchToolResultBlockParam;

export interface ContentBlockSource {
  content: string | Array<ContentBlockSourceContent>;

  type: 'content';
}

export type ContentBlockSourceContent = TextBlockParam | ImageBlockParam;

export interface DocumentBlockParam {
  source: Base64PDFSource | PlainTextSource | ContentBlockSource | URLPDFSource;

  type: 'document';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  citations?: CitationsConfigParam | null;

  context?: string | null;

  title?: string | null;
}

export interface ImageBlockParam {
  source: Base64ImageSource | URLImageSource;

  type: 'image';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export interface InputJSONDelta {
  partial_json: string;

  type: 'input_json_delta';
}

export interface Message {
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  id: string;

  /**
   * Content generated by the model.
   *
   * This is an array of content blocks, each of which has a `type` that determines
   * its shape.
   *
   * Example:
   *
   * ```json
   * [{ "type": "text", "text": "Hi, I'm Claude." }]
   * ```
   *
   * If the request input `messages` ended with an `assistant` turn, then the
   * response `content` will continue directly from that last turn. You can use this
   * to constrain the model's output.
   *
   * For example, if the input `messages` were:
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
   * Then the response `content` might be:
   *
   * ```json
   * [{ "type": "text", "text": "B)" }]
   * ```
   */
  content: Array<ContentBlock>;

  /**
   * The model that will complete your prompt.\n\nSee
   * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
   * details and options.
   */
  model: Model;

  /**
   * Conversational role of the generated message.
   *
   * This will always be `"assistant"`.
   */
  role: 'assistant';

  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   *
   * - `"end_turn"`: the model reached a natural stopping point
   * - `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
   * - `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
   * - `"tool_use"`: the model invoked one or more tools
   * - `"pause_turn"`: we paused a long-running turn. You may provide the response
   *   back as-is in a subsequent request to let the model continue.
   * - `"refusal"`: when streaming classifiers intervene to handle potential policy
   *   violations
   *
   * In non-streaming mode this value is always non-null. In streaming mode, it is
   * null in the `message_start` event and non-null otherwise.
   */
  stop_reason: StopReason | null;

  /**
   * Which custom stop sequence was generated, if any.
   *
   * This value will be a non-null string if one of your custom stop sequences was
   * generated.
   */
  stop_sequence: string | null;

  /**
   * Object type.
   *
   * For Messages, this is always `"message"`.
   */
  type: 'message';

  /**
   * Billing and rate-limit usage.
   *
   * Anthropic's API bills and rate-limits by token counts, as tokens represent the
   * underlying cost to our systems.
   *
   * Under the hood, the API transforms requests into a format suitable for the
   * model. The model's output then goes through a parsing stage before becoming an
   * API response. As a result, the token counts in `usage` will not match one-to-one
   * with the exact visible content of an API request or response.
   *
   * For example, `output_tokens` will be non-zero, even for an empty string response
   * from Claude.
   *
   * Total input tokens in a request is the summation of `input_tokens`,
   * `cache_creation_input_tokens`, and `cache_read_input_tokens`.
   */
  usage: Usage;
}

export type MessageCountTokensTool =
  | Tool
  | ToolBash20250124
  | ToolTextEditor20250124
  | ToolTextEditor20250429
  | ToolTextEditor20250728
  | WebSearchTool20250305;

export interface MessageDeltaUsage {
  /**
   * The cumulative number of input tokens used to create the cache entry.
   */
  cache_creation_input_tokens: number | null;

  /**
   * The cumulative number of input tokens read from the cache.
   */
  cache_read_input_tokens: number | null;

  /**
   * The cumulative number of input tokens which were used.
   */
  input_tokens: number | null;

  /**
   * The cumulative number of output tokens which were used.
   */
  output_tokens: number;

  /**
   * The number of server tool requests.
   */
  server_tool_use: ServerToolUsage | null;
}

export interface MessageParam {
  content: string | Array<ContentBlockParam>;

  role: 'user' | 'assistant';
}

export interface MessageTokensCount {
  /**
   * The total number of tokens across the provided list of messages, system prompt,
   * and tools.
   */
  input_tokens: number;
}

export interface Metadata {
  /**
   * An external identifier for the user who is associated with the request.
   *
   * This should be a uuid, hash value, or other opaque identifier. Anthropic may use
   * this id to help detect abuse. Do not include any identifying information such as
   * name, email address, or phone number.
   */
  user_id?: string | null;
}

/**
 * The model that will complete your prompt.\n\nSee
 * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
 * details and options.
 */
export type Model =
  | 'claude-opus-4-5-20251101'
  | 'claude-opus-4-5'
  | 'claude-3-7-sonnet-latest'
  | 'claude-3-7-sonnet-20250219'
  | 'claude-3-5-haiku-latest'
  | 'claude-3-5-haiku-20241022'
  | 'claude-haiku-4-5'
  | 'claude-haiku-4-5-20251001'
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-0'
  | 'claude-4-sonnet-20250514'
  | 'claude-sonnet-4-5'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-opus-4-0'
  | 'claude-opus-4-20250514'
  | 'claude-4-opus-20250514'
  | 'claude-opus-4-1-20250805'
  | 'claude-3-opus-latest'
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307'
  | (string & {});

const DEPRECATED_MODELS: {
  [K in Model]?: string;
} = {
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

export interface PlainTextSource {
  data: string;

  media_type: 'text/plain';

  type: 'text';
}

export type RawContentBlockDelta =
  | TextDelta
  | InputJSONDelta
  | CitationsDelta
  | ThinkingDelta
  | SignatureDelta;

export interface RawContentBlockDeltaEvent {
  delta: RawContentBlockDelta;

  index: number;

  type: 'content_block_delta';
}

export interface RawContentBlockStartEvent {
  content_block:
    | TextBlock
    | ThinkingBlock
    | RedactedThinkingBlock
    | ToolUseBlock
    | ServerToolUseBlock
    | WebSearchToolResultBlock;

  index: number;

  type: 'content_block_start';
}

export interface RawContentBlockStopEvent {
  index: number;

  type: 'content_block_stop';
}

export interface RawMessageDeltaEvent {
  delta: RawMessageDeltaEvent.Delta;

  type: 'message_delta';

  /**
   * Billing and rate-limit usage.
   *
   * Anthropic's API bills and rate-limits by token counts, as tokens represent the
   * underlying cost to our systems.
   *
   * Under the hood, the API transforms requests into a format suitable for the
   * model. The model's output then goes through a parsing stage before becoming an
   * API response. As a result, the token counts in `usage` will not match one-to-one
   * with the exact visible content of an API request or response.
   *
   * For example, `output_tokens` will be non-zero, even for an empty string response
   * from Claude.
   *
   * Total input tokens in a request is the summation of `input_tokens`,
   * `cache_creation_input_tokens`, and `cache_read_input_tokens`.
   */
  usage: MessageDeltaUsage;
}

export namespace RawMessageDeltaEvent {
  export interface Delta {
    stop_reason: MessagesAPI.StopReason | null;

    stop_sequence: string | null;
  }
}

export interface RawMessageStartEvent {
  message: Message;

  type: 'message_start';
}

export interface RawMessageStopEvent {
  type: 'message_stop';
}

export type RawMessageStreamEvent =
  | RawMessageStartEvent
  | RawMessageDeltaEvent
  | RawMessageStopEvent
  | RawContentBlockStartEvent
  | RawContentBlockDeltaEvent
  | RawContentBlockStopEvent;

export interface RedactedThinkingBlock {
  data: string;

  type: 'redacted_thinking';
}

export interface RedactedThinkingBlockParam {
  data: string;

  type: 'redacted_thinking';
}

export interface SearchResultBlockParam {
  content: Array<TextBlockParam>;

  source: string;

  title: string;

  type: 'search_result';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  citations?: CitationsConfigParam;
}

export interface ServerToolUsage {
  /**
   * The number of web search tool requests.
   */
  web_search_requests: number;
}

export interface ServerToolUseBlock {
  id: string;

  input: unknown;

  name: 'web_search';

  type: 'server_tool_use';
}

export interface ServerToolUseBlockParam {
  id: string;

  input: unknown;

  name: 'web_search';

  type: 'server_tool_use';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export interface SignatureDelta {
  signature: string;

  type: 'signature_delta';
}

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal';

export interface TextBlock {
  /**
   * Citations supporting the text block.
   *
   * The type of citation returned will depend on the type of document being cited.
   * Citing a PDF results in `page_location`, plain text results in `char_location`,
   * and content document results in `content_block_location`.
   */
  citations: Array<TextCitation> | null;

  text: string;

  type: 'text';
}

export interface TextBlockParam {
  text: string;

  type: 'text';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  citations?: Array<TextCitationParam> | null;
}

export type TextCitation =
  | CitationCharLocation
  | CitationPageLocation
  | CitationContentBlockLocation
  | CitationsWebSearchResultLocation
  | CitationsSearchResultLocation;

export type TextCitationParam =
  | CitationCharLocationParam
  | CitationPageLocationParam
  | CitationContentBlockLocationParam
  | CitationWebSearchResultLocationParam
  | CitationSearchResultLocationParam;

export interface TextDelta {
  text: string;

  type: 'text_delta';
}

export interface ThinkingBlock {
  signature: string;

  thinking: string;

  type: 'thinking';
}

export interface ThinkingBlockParam {
  signature: string;

  thinking: string;

  type: 'thinking';
}

export interface ThinkingConfigDisabled {
  type: 'disabled';
}

export interface ThinkingConfigEnabled {
  /**
   * Determines how many tokens Claude can use for its internal reasoning process.
   * Larger budgets can enable more thorough analysis for complex problems, improving
   * response quality.
   *
   * Must be ≥1024 and less than `max_tokens`.
   *
   * See
   * [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
   * for details.
   */
  budget_tokens: number;

  type: 'enabled';
}

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
export type ThinkingConfigParam = ThinkingConfigEnabled | ThinkingConfigDisabled;

export interface ThinkingDelta {
  thinking: string;

  type: 'thinking_delta';
}

export interface Tool {
  /**
   * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
   *
   * This defines the shape of the `input` that your tool accepts and that the model
   * will produce.
   */
  input_schema: Tool.InputSchema;

  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: string;

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  /**
   * Description of what this tool does.
   *
   * Tool descriptions should be as detailed as possible. The more information that
   * the model has about what the tool is and how to use it, the better it will
   * perform. You can use natural language descriptions to reinforce important
   * aspects of the tool input JSON schema.
   */
  description?: string;

  type?: 'custom' | null;
}

export namespace Tool {
  /**
   * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
   *
   * This defines the shape of the `input` that your tool accepts and that the model
   * will produce.
   */
  export interface InputSchema {
    type: 'object';

    properties?: unknown | null;

    required?: Array<string> | null;

    [k: string]: unknown;
  }
}

export interface ToolBash20250124 {
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: 'bash';

  type: 'bash_20250124';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

/**
 * How the model should use the provided tools. The model can use a specific tool,
 * any available tool, decide by itself, or not use tools at all.
 */
export type ToolChoice = ToolChoiceAuto | ToolChoiceAny | ToolChoiceTool | ToolChoiceNone;

/**
 * The model will use any available tools.
 */
export interface ToolChoiceAny {
  type: 'any';

  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool
   * use.
   */
  disable_parallel_tool_use?: boolean;
}

/**
 * The model will automatically decide whether to use tools.
 */
export interface ToolChoiceAuto {
  type: 'auto';

  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output at most one tool
   * use.
   */
  disable_parallel_tool_use?: boolean;
}

/**
 * The model will not be allowed to use tools.
 */
export interface ToolChoiceNone {
  type: 'none';
}

/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export interface ToolChoiceTool {
  /**
   * The name of the tool to use.
   */
  name: string;

  type: 'tool';

  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool
   * use.
   */
  disable_parallel_tool_use?: boolean;
}

export interface ToolResultBlockParam {
  tool_use_id: string;

  type: 'tool_result';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  content?: string | Array<TextBlockParam | ImageBlockParam | SearchResultBlockParam | DocumentBlockParam>;

  is_error?: boolean;
}

export interface ToolTextEditor20250124 {
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: 'str_replace_editor';

  type: 'text_editor_20250124';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export interface ToolTextEditor20250429 {
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: 'str_replace_based_edit_tool';

  type: 'text_editor_20250429';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export interface ToolTextEditor20250728 {
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: 'str_replace_based_edit_tool';

  type: 'text_editor_20250728';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  /**
   * Maximum number of characters to display when viewing a file. If not specified,
   * defaults to displaying the full file.
   */
  max_characters?: number | null;
}

export type ToolUnion =
  | Tool
  | ToolBash20250124
  | ToolTextEditor20250124
  | ToolTextEditor20250429
  | ToolTextEditor20250728
  | WebSearchTool20250305;

export interface ToolUseBlock {
  id: string;

  input: unknown;

  name: string;

  type: 'tool_use';
}

export interface ToolUseBlockParam {
  id: string;

  input: unknown;

  name: string;

  type: 'tool_use';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export interface URLImageSource {
  type: 'url';

  url: string;
}

export interface URLPDFSource {
  type: 'url';

  url: string;
}

export interface Usage {
  /**
   * Breakdown of cached tokens by TTL
   */
  cache_creation: CacheCreation | null;

  /**
   * The number of input tokens used to create the cache entry.
   */
  cache_creation_input_tokens: number | null;

  /**
   * The number of input tokens read from the cache.
   */
  cache_read_input_tokens: number | null;

  /**
   * The number of input tokens which were used.
   */
  input_tokens: number;

  /**
   * The number of output tokens which were used.
   */
  output_tokens: number;

  /**
   * The number of server tool requests.
   */
  server_tool_use: ServerToolUsage | null;

  /**
   * If the request used the priority, standard, or batch tier.
   */
  service_tier: 'standard' | 'priority' | 'batch' | null;
}

export interface WebSearchResultBlock {
  encrypted_content: string;

  page_age: string | null;

  title: string;

  type: 'web_search_result';

  url: string;
}

export interface WebSearchResultBlockParam {
  encrypted_content: string;

  title: string;

  type: 'web_search_result';

  url: string;

  page_age?: string | null;
}

export interface WebSearchTool20250305 {
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  name: 'web_search';

  type: 'web_search_20250305';

  /**
   * If provided, only these domains will be included in results. Cannot be used
   * alongside `blocked_domains`.
   */
  allowed_domains?: Array<string> | null;

  /**
   * If provided, these domains will never appear in results. Cannot be used
   * alongside `allowed_domains`.
   */
  blocked_domains?: Array<string> | null;

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;

  /**
   * Maximum number of times the tool can be used in the API request.
   */
  max_uses?: number | null;

  /**
   * Parameters for the user's location. Used to provide more relevant search
   * results.
   */
  user_location?: WebSearchTool20250305.UserLocation | null;
}

export namespace WebSearchTool20250305 {
  /**
   * Parameters for the user's location. Used to provide more relevant search
   * results.
   */
  export interface UserLocation {
    type: 'approximate';

    /**
     * The city of the user.
     */
    city?: string | null;

    /**
     * The two letter
     * [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) of the
     * user.
     */
    country?: string | null;

    /**
     * The region of the user.
     */
    region?: string | null;

    /**
     * The [IANA timezone](https://nodatime.org/TimeZones) of the user.
     */
    timezone?: string | null;
  }
}

export interface WebSearchToolRequestError {
  error_code:
    | 'invalid_tool_input'
    | 'unavailable'
    | 'max_uses_exceeded'
    | 'too_many_requests'
    | 'query_too_long';

  type: 'web_search_tool_result_error';
}

export interface WebSearchToolResultBlock {
  content: WebSearchToolResultBlockContent;

  tool_use_id: string;

  type: 'web_search_tool_result';
}

export type WebSearchToolResultBlockContent = WebSearchToolResultError | Array<WebSearchResultBlock>;

export interface WebSearchToolResultBlockParam {
  content: WebSearchToolResultBlockParamContent;

  tool_use_id: string;

  type: 'web_search_tool_result';

  /**
   * Create a cache control breakpoint at this content block.
   */
  cache_control?: CacheControlEphemeral | null;
}

export type WebSearchToolResultBlockParamContent =
  | Array<WebSearchResultBlockParam>
  | WebSearchToolRequestError;

export interface WebSearchToolResultError {
  error_code:
    | 'invalid_tool_input'
    | 'unavailable'
    | 'max_uses_exceeded'
    | 'too_many_requests'
    | 'query_too_long';

  type: 'web_search_tool_result_error';
}

export type MessageStreamEvent = RawMessageStreamEvent;

export type MessageStartEvent = RawMessageStartEvent;

export type MessageDeltaEvent = RawMessageDeltaEvent;

export type MessageStopEvent = RawMessageStopEvent;

export type ContentBlockStartEvent = RawContentBlockStartEvent;

export type ContentBlockDeltaEvent = RawContentBlockDeltaEvent;

export type ContentBlockStopEvent = RawContentBlockStopEvent;

export type MessageCreateParams = MessageCreateParamsNonStreaming | MessageCreateParamsStreaming;

export interface MessageCreateParamsBase {
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
  messages: Array<MessageParam>;

  /**
   * The model that will complete your prompt.\n\nSee
   * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
   * details and options.
   */
  model: Model;

  /**
   * An object describing metadata about the request.
   */
  metadata?: Metadata;

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
  system?: string | Array<TextBlockParam>;

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
  thinking?: ThinkingConfigParam;

  /**
   * How the model should use the provided tools. The model can use a specific tool,
   * any available tool, decide by itself, or not use tools at all.
   */
  tool_choice?: ToolChoice;

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
  tools?: Array<ToolUnion>;

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

export namespace MessageCreateParams {
  export type MessageCreateParamsNonStreaming = MessagesAPI.MessageCreateParamsNonStreaming;
  export type MessageCreateParamsStreaming = MessagesAPI.MessageCreateParamsStreaming;
}

export interface MessageCreateParamsNonStreaming extends MessageCreateParamsBase {
  /**
   * Whether to incrementally stream the response using server-sent events.
   *
   * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
   */
  stream?: false;
}

export interface MessageCreateParamsStreaming extends MessageCreateParamsBase {
  /**
   * Whether to incrementally stream the response using server-sent events.
   *
   * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
   */
  stream: true;
}

export type MessageStreamParams = MessageCreateParamsBase;

export interface MessageCountTokensParams {
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
  messages: Array<MessageParam>;

  /**
   * The model that will complete your prompt.\n\nSee
   * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
   * details and options.
   */
  model: Model;

  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such
   * as specifying a particular goal or role. See our
   * [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
   */
  system?: string | Array<TextBlockParam>;

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
  thinking?: ThinkingConfigParam;

  /**
   * How the model should use the provided tools. The model can use a specific tool,
   * any available tool, decide by itself, or not use tools at all.
   */
  tool_choice?: ToolChoice;

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
  tools?: Array<MessageCountTokensTool>;
}

Messages.Batches = Batches;

export declare namespace Messages {
  export {
    type Base64ImageSource as Base64ImageSource,
    type Base64PDFSource as Base64PDFSource,
    type CacheControlEphemeral as CacheControlEphemeral,
    type CacheCreation as CacheCreation,
    type CitationCharLocation as CitationCharLocation,
    type CitationCharLocationParam as CitationCharLocationParam,
    type CitationContentBlockLocation as CitationContentBlockLocation,
    type CitationContentBlockLocationParam as CitationContentBlockLocationParam,
    type CitationPageLocation as CitationPageLocation,
    type CitationPageLocationParam as CitationPageLocationParam,
    type CitationSearchResultLocationParam as CitationSearchResultLocationParam,
    type CitationWebSearchResultLocationParam as CitationWebSearchResultLocationParam,
    type CitationsConfigParam as CitationsConfigParam,
    type CitationsDelta as CitationsDelta,
    type CitationsSearchResultLocation as CitationsSearchResultLocation,
    type CitationsWebSearchResultLocation as CitationsWebSearchResultLocation,
    type ContentBlock as ContentBlock,
    type ContentBlockParam as ContentBlockParam,
    type ContentBlockStartEvent as ContentBlockStartEvent,
    type ContentBlockStopEvent as ContentBlockStopEvent,
    type ContentBlockSource as ContentBlockSource,
    type ContentBlockSourceContent as ContentBlockSourceContent,
    type DocumentBlockParam as DocumentBlockParam,
    type ImageBlockParam as ImageBlockParam,
    type InputJSONDelta as InputJSONDelta,
    type Message as Message,
    type MessageCountTokensTool as MessageCountTokensTool,
    type MessageDeltaEvent as MessageDeltaEvent,
    type MessageDeltaUsage as MessageDeltaUsage,
    type MessageParam as MessageParam,
    type MessageTokensCount as MessageTokensCount,
    type Metadata as Metadata,
    type Model as Model,
    type PlainTextSource as PlainTextSource,
    type RawContentBlockDelta as RawContentBlockDelta,
    type RawContentBlockDeltaEvent as RawContentBlockDeltaEvent,
    type RawContentBlockStartEvent as RawContentBlockStartEvent,
    type RawContentBlockStopEvent as RawContentBlockStopEvent,
    type RawMessageDeltaEvent as RawMessageDeltaEvent,
    type RawMessageStartEvent as RawMessageStartEvent,
    type RawMessageStopEvent as RawMessageStopEvent,
    type RawMessageStreamEvent as RawMessageStreamEvent,
    type RedactedThinkingBlock as RedactedThinkingBlock,
    type RedactedThinkingBlockParam as RedactedThinkingBlockParam,
    type SearchResultBlockParam as SearchResultBlockParam,
    type ServerToolUsage as ServerToolUsage,
    type ServerToolUseBlock as ServerToolUseBlock,
    type ServerToolUseBlockParam as ServerToolUseBlockParam,
    type SignatureDelta as SignatureDelta,
    type StopReason as StopReason,
    type TextBlock as TextBlock,
    type TextBlockParam as TextBlockParam,
    type TextCitation as TextCitation,
    type TextCitationParam as TextCitationParam,
    type TextDelta as TextDelta,
    type ThinkingBlock as ThinkingBlock,
    type ThinkingBlockParam as ThinkingBlockParam,
    type ThinkingConfigDisabled as ThinkingConfigDisabled,
    type ThinkingConfigEnabled as ThinkingConfigEnabled,
    type ThinkingConfigParam as ThinkingConfigParam,
    type ThinkingDelta as ThinkingDelta,
    type Tool as Tool,
    type ToolBash20250124 as ToolBash20250124,
    type ToolChoice as ToolChoice,
    type ToolChoiceAny as ToolChoiceAny,
    type ToolChoiceAuto as ToolChoiceAuto,
    type ToolChoiceNone as ToolChoiceNone,
    type ToolChoiceTool as ToolChoiceTool,
    type ToolResultBlockParam as ToolResultBlockParam,
    type ToolTextEditor20250124 as ToolTextEditor20250124,
    type ToolTextEditor20250429 as ToolTextEditor20250429,
    type ToolTextEditor20250728 as ToolTextEditor20250728,
    type ToolUnion as ToolUnion,
    type ToolUseBlock as ToolUseBlock,
    type ToolUseBlockParam as ToolUseBlockParam,
    type URLImageSource as URLImageSource,
    type URLPDFSource as URLPDFSource,
    type Usage as Usage,
    type WebSearchResultBlock as WebSearchResultBlock,
    type WebSearchResultBlockParam as WebSearchResultBlockParam,
    type WebSearchTool20250305 as WebSearchTool20250305,
    type WebSearchToolRequestError as WebSearchToolRequestError,
    type WebSearchToolResultBlock as WebSearchToolResultBlock,
    type WebSearchToolResultBlockContent as WebSearchToolResultBlockContent,
    type WebSearchToolResultBlockParam as WebSearchToolResultBlockParam,
    type WebSearchToolResultBlockParamContent as WebSearchToolResultBlockParamContent,
    type WebSearchToolResultError as WebSearchToolResultError,
    type MessageStreamEvent as MessageStreamEvent,
    type MessageStartEvent as MessageStartEvent,
    type MessageStopEvent as MessageStopEvent,
    type ContentBlockDeltaEvent as ContentBlockDeltaEvent,
    type MessageCreateParams as MessageCreateParams,
    type MessageCreateParamsNonStreaming as MessageCreateParamsNonStreaming,
    type MessageCreateParamsStreaming as MessageCreateParamsStreaming,
    type MessageStreamParams as MessageStreamParams,
    type MessageCountTokensParams as MessageCountTokensParams,
  };

  export {
    Batches as Batches,
    type DeletedMessageBatch as DeletedMessageBatch,
    type MessageBatch as MessageBatch,
    type MessageBatchCanceledResult as MessageBatchCanceledResult,
    type MessageBatchErroredResult as MessageBatchErroredResult,
    type MessageBatchExpiredResult as MessageBatchExpiredResult,
    type MessageBatchIndividualResponse as MessageBatchIndividualResponse,
    type MessageBatchRequestCounts as MessageBatchRequestCounts,
    type MessageBatchResult as MessageBatchResult,
    type MessageBatchSucceededResult as MessageBatchSucceededResult,
    type MessageBatchesPage as MessageBatchesPage,
    type BatchCreateParams as BatchCreateParams,
    type BatchListParams as BatchListParams,
  };
}
