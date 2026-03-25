import { APIPromise } from "../../../core/api-promise.js";
import { APIResource } from "../../../core/resource.js";
import { Stream } from "../../../core/streaming.js";
import { RequestOptions } from "../../../internal/request-options.js";
import { type ExtractParsedContentFromBetaParams, type ParsedBetaMessage } from "../../../lib/beta-parser.js";
import { BetaMessageStream } from "../../../lib/BetaMessageStream.js";
import { BetaToolRunner, BetaToolRunnerParams, BetaToolRunnerRequestOptions } from "../../../lib/tools/BetaToolRunner.js";
import * as MessagesAPI from "../../messages/messages.js";
import * as BetaAPI from "../beta.js";
import * as BatchesAPI from "./batches.js";
import { BatchCancelParams, BatchCreateParams, BatchDeleteParams, BatchListParams, BatchResultsParams, BatchRetrieveParams, Batches, BetaDeletedMessageBatch, BetaMessageBatch, BetaMessageBatchCanceledResult, BetaMessageBatchErroredResult, BetaMessageBatchExpiredResult, BetaMessageBatchIndividualResponse, BetaMessageBatchRequestCounts, BetaMessageBatchResult, BetaMessageBatchSucceededResult, BetaMessageBatchesPage } from "./batches.js";
import * as MessagesMessagesAPI from "./messages.js";
export declare class Messages extends APIResource {
    batches: BatchesAPI.Batches;
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
     * const betaMessage = await client.beta.messages.create({
     *   max_tokens: 1024,
     *   messages: [{ content: 'Hello, world', role: 'user' }],
     *   model: 'claude-sonnet-4-5-20250929',
     * });
     * ```
     */
    create(params: MessageCreateParamsNonStreaming, options?: RequestOptions): APIPromise<BetaMessage>;
    create(params: MessageCreateParamsStreaming, options?: RequestOptions): APIPromise<Stream<BetaRawMessageStreamEvent>>;
    create(params: MessageCreateParamsBase, options?: RequestOptions): APIPromise<Stream<BetaRawMessageStreamEvent> | BetaMessage>;
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
    parse<Params extends MessageCreateParamsNonStreaming>(params: Params, options?: RequestOptions): APIPromise<ParsedBetaMessage<ExtractParsedContentFromBetaParams<Params>>>;
    /**
     * Create a Message stream
     */
    stream<Params extends BetaMessageStreamParams>(body: Params, options?: RequestOptions): BetaMessageStream<ExtractParsedContentFromBetaParams<Params>>;
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
    countTokens(params: MessageCountTokensParams, options?: RequestOptions): APIPromise<BetaMessageTokensCount>;
    toolRunner(body: BetaToolRunnerParams & {
        stream?: false;
    }, options?: BetaToolRunnerRequestOptions): BetaToolRunner<false>;
    toolRunner(body: BetaToolRunnerParams & {
        stream: true;
    }, options?: BetaToolRunnerRequestOptions): BetaToolRunner<true>;
    toolRunner(body: BetaToolRunnerParams, options?: BetaToolRunnerRequestOptions): BetaToolRunner<boolean>;
}
export interface BetaAllThinkingTurns {
    type: 'all';
}
export type BetaMessageStreamParams = MessageCreateParamsBase;
export interface BetaBase64ImageSource {
    data: string;
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    type: 'base64';
}
export interface BetaBase64PDFSource {
    data: string;
    media_type: 'application/pdf';
    type: 'base64';
}
export interface BetaBashCodeExecutionOutputBlock {
    file_id: string;
    type: 'bash_code_execution_output';
}
export interface BetaBashCodeExecutionOutputBlockParam {
    file_id: string;
    type: 'bash_code_execution_output';
}
export interface BetaBashCodeExecutionResultBlock {
    content: Array<BetaBashCodeExecutionOutputBlock>;
    return_code: number;
    stderr: string;
    stdout: string;
    type: 'bash_code_execution_result';
}
export interface BetaBashCodeExecutionResultBlockParam {
    content: Array<BetaBashCodeExecutionOutputBlockParam>;
    return_code: number;
    stderr: string;
    stdout: string;
    type: 'bash_code_execution_result';
}
export interface BetaBashCodeExecutionToolResultBlock {
    content: BetaBashCodeExecutionToolResultError | BetaBashCodeExecutionResultBlock;
    tool_use_id: string;
    type: 'bash_code_execution_tool_result';
}
export interface BetaBashCodeExecutionToolResultBlockParam {
    content: BetaBashCodeExecutionToolResultErrorParam | BetaBashCodeExecutionResultBlockParam;
    tool_use_id: string;
    type: 'bash_code_execution_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaBashCodeExecutionToolResultError {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded' | 'output_file_too_large';
    type: 'bash_code_execution_tool_result_error';
}
export interface BetaBashCodeExecutionToolResultErrorParam {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded' | 'output_file_too_large';
    type: 'bash_code_execution_tool_result_error';
}
export interface BetaCacheControlEphemeral {
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
export interface BetaCacheCreation {
    /**
     * The number of input tokens used to create the 1 hour cache entry.
     */
    ephemeral_1h_input_tokens: number;
    /**
     * The number of input tokens used to create the 5 minute cache entry.
     */
    ephemeral_5m_input_tokens: number;
}
export interface BetaCitationCharLocation {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_char_index: number;
    file_id: string | null;
    start_char_index: number;
    type: 'char_location';
}
export interface BetaCitationCharLocationParam {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_char_index: number;
    start_char_index: number;
    type: 'char_location';
}
export interface BetaCitationConfig {
    enabled: boolean;
}
export interface BetaCitationContentBlockLocation {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_block_index: number;
    file_id: string | null;
    start_block_index: number;
    type: 'content_block_location';
}
export interface BetaCitationContentBlockLocationParam {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_block_index: number;
    start_block_index: number;
    type: 'content_block_location';
}
export interface BetaCitationPageLocation {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_page_number: number;
    file_id: string | null;
    start_page_number: number;
    type: 'page_location';
}
export interface BetaCitationPageLocationParam {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_page_number: number;
    start_page_number: number;
    type: 'page_location';
}
export interface BetaCitationSearchResultLocation {
    cited_text: string;
    end_block_index: number;
    search_result_index: number;
    source: string;
    start_block_index: number;
    title: string | null;
    type: 'search_result_location';
}
export interface BetaCitationSearchResultLocationParam {
    cited_text: string;
    end_block_index: number;
    search_result_index: number;
    source: string;
    start_block_index: number;
    title: string | null;
    type: 'search_result_location';
}
export interface BetaCitationWebSearchResultLocationParam {
    cited_text: string;
    encrypted_index: string;
    title: string | null;
    type: 'web_search_result_location';
    url: string;
}
export interface BetaCitationsConfigParam {
    enabled?: boolean;
}
export interface BetaCitationsDelta {
    citation: BetaCitationCharLocation | BetaCitationPageLocation | BetaCitationContentBlockLocation | BetaCitationsWebSearchResultLocation | BetaCitationSearchResultLocation;
    type: 'citations_delta';
}
export interface BetaCitationsWebSearchResultLocation {
    cited_text: string;
    encrypted_index: string;
    title: string | null;
    type: 'web_search_result_location';
    url: string;
}
export interface BetaClearThinking20251015Edit {
    type: 'clear_thinking_20251015';
    /**
     * Number of most recent assistant turns to keep thinking blocks for. Older turns
     * will have their thinking blocks removed.
     */
    keep?: BetaThinkingTurns | BetaAllThinkingTurns | 'all';
}
export interface BetaClearThinking20251015EditResponse {
    /**
     * Number of input tokens cleared by this edit.
     */
    cleared_input_tokens: number;
    /**
     * Number of thinking turns that were cleared.
     */
    cleared_thinking_turns: number;
    /**
     * The type of context management edit applied.
     */
    type: 'clear_thinking_20251015';
}
export interface BetaClearToolUses20250919Edit {
    type: 'clear_tool_uses_20250919';
    /**
     * Minimum number of tokens that must be cleared when triggered. Context will only
     * be modified if at least this many tokens can be removed.
     */
    clear_at_least?: BetaInputTokensClearAtLeast | null;
    /**
     * Whether to clear all tool inputs (bool) or specific tool inputs to clear (list)
     */
    clear_tool_inputs?: boolean | Array<string> | null;
    /**
     * Tool names whose uses are preserved from clearing
     */
    exclude_tools?: Array<string> | null;
    /**
     * Number of tool uses to retain in the conversation
     */
    keep?: BetaToolUsesKeep;
    /**
     * Condition that triggers the context management strategy
     */
    trigger?: BetaInputTokensTrigger | BetaToolUsesTrigger;
}
export interface BetaClearToolUses20250919EditResponse {
    /**
     * Number of input tokens cleared by this edit.
     */
    cleared_input_tokens: number;
    /**
     * Number of tool uses that were cleared.
     */
    cleared_tool_uses: number;
    /**
     * The type of context management edit applied.
     */
    type: 'clear_tool_uses_20250919';
}
export interface BetaCodeExecutionOutputBlock {
    file_id: string;
    type: 'code_execution_output';
}
export interface BetaCodeExecutionOutputBlockParam {
    file_id: string;
    type: 'code_execution_output';
}
export interface BetaCodeExecutionResultBlock {
    content: Array<BetaCodeExecutionOutputBlock>;
    return_code: number;
    stderr: string;
    stdout: string;
    type: 'code_execution_result';
}
export interface BetaCodeExecutionResultBlockParam {
    content: Array<BetaCodeExecutionOutputBlockParam>;
    return_code: number;
    stderr: string;
    stdout: string;
    type: 'code_execution_result';
}
export interface BetaCodeExecutionTool20250522 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'code_execution';
    type: 'code_execution_20250522';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    strict?: boolean;
}
export interface BetaCodeExecutionTool20250825 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'code_execution';
    type: 'code_execution_20250825';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    strict?: boolean;
}
export interface BetaCodeExecutionToolResultBlock {
    content: BetaCodeExecutionToolResultBlockContent;
    tool_use_id: string;
    type: 'code_execution_tool_result';
}
export type BetaCodeExecutionToolResultBlockContent = BetaCodeExecutionToolResultError | BetaCodeExecutionResultBlock;
export interface BetaCodeExecutionToolResultBlockParam {
    content: BetaCodeExecutionToolResultBlockParamContent;
    tool_use_id: string;
    type: 'code_execution_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export type BetaCodeExecutionToolResultBlockParamContent = BetaCodeExecutionToolResultErrorParam | BetaCodeExecutionResultBlockParam;
export interface BetaCodeExecutionToolResultError {
    error_code: BetaCodeExecutionToolResultErrorCode;
    type: 'code_execution_tool_result_error';
}
export type BetaCodeExecutionToolResultErrorCode = 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded';
export interface BetaCodeExecutionToolResultErrorParam {
    error_code: BetaCodeExecutionToolResultErrorCode;
    type: 'code_execution_tool_result_error';
}
/**
 * Information about the container used in the request (for the code execution
 * tool)
 */
export interface BetaContainer {
    /**
     * Identifier for the container used in this request
     */
    id: string;
    /**
     * The time at which the container will expire.
     */
    expires_at: string;
    /**
     * Skills loaded in the container
     */
    skills: Array<BetaSkill> | null;
}
/**
 * Container parameters with skills to be loaded.
 */
export interface BetaContainerParams {
    /**
     * Container id
     */
    id?: string | null;
    /**
     * List of skills to load in the container
     */
    skills?: Array<BetaSkillParams> | null;
}
/**
 * Response model for a file uploaded to the container.
 */
export interface BetaContainerUploadBlock {
    file_id: string;
    type: 'container_upload';
}
/**
 * A content block that represents a file to be uploaded to the container Files
 * uploaded via this block will be available in the container's input directory.
 */
export interface BetaContainerUploadBlockParam {
    file_id: string;
    type: 'container_upload';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
/**
 * Response model for a file uploaded to the container.
 */
export type BetaContentBlock = BetaTextBlock | BetaThinkingBlock | BetaRedactedThinkingBlock | BetaToolUseBlock | BetaServerToolUseBlock | BetaWebSearchToolResultBlock | BetaWebFetchToolResultBlock | BetaCodeExecutionToolResultBlock | BetaBashCodeExecutionToolResultBlock | BetaTextEditorCodeExecutionToolResultBlock | BetaToolSearchToolResultBlock | BetaMCPToolUseBlock | BetaMCPToolResultBlock | BetaContainerUploadBlock;
/**
 * Regular text content.
 */
export type BetaContentBlockParam = BetaTextBlockParam | BetaImageBlockParam | BetaRequestDocumentBlock | BetaSearchResultBlockParam | BetaThinkingBlockParam | BetaRedactedThinkingBlockParam | BetaToolUseBlockParam | BetaToolResultBlockParam | BetaServerToolUseBlockParam | BetaWebSearchToolResultBlockParam | BetaWebFetchToolResultBlockParam | BetaCodeExecutionToolResultBlockParam | BetaBashCodeExecutionToolResultBlockParam | BetaTextEditorCodeExecutionToolResultBlockParam | BetaToolSearchToolResultBlockParam | BetaMCPToolUseBlockParam | BetaRequestMCPToolResultBlockParam | BetaContainerUploadBlockParam;
export interface BetaContentBlockSource {
    content: string | Array<BetaContentBlockSourceContent>;
    type: 'content';
}
export type BetaContentBlockSourceContent = BetaTextBlockParam | BetaImageBlockParam;
export interface BetaContextManagementConfig {
    /**
     * List of context management edits to apply
     */
    edits?: Array<BetaClearToolUses20250919Edit | BetaClearThinking20251015Edit>;
}
export interface BetaContextManagementResponse {
    /**
     * List of context management edits that were applied.
     */
    applied_edits: Array<BetaClearToolUses20250919EditResponse | BetaClearThinking20251015EditResponse>;
}
export interface BetaCountTokensContextManagementResponse {
    /**
     * The original token count before context management was applied
     */
    original_input_tokens: number;
}
/**
 * Tool invocation directly from the model.
 */
export interface BetaDirectCaller {
    type: 'direct';
}
export interface BetaDocumentBlock {
    /**
     * Citation configuration for the document
     */
    citations: BetaCitationConfig | null;
    source: BetaBase64PDFSource | BetaPlainTextSource;
    /**
     * The title of the document
     */
    title: string | null;
    type: 'document';
}
export interface BetaFileDocumentSource {
    file_id: string;
    type: 'file';
}
export interface BetaFileImageSource {
    file_id: string;
    type: 'file';
}
export interface BetaImageBlockParam {
    source: BetaBase64ImageSource | BetaURLImageSource | BetaFileImageSource;
    type: 'image';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaInputJSONDelta {
    partial_json: string;
    type: 'input_json_delta';
}
export interface BetaInputTokensClearAtLeast {
    type: 'input_tokens';
    value: number;
}
export interface BetaInputTokensTrigger {
    type: 'input_tokens';
    value: number;
}
export interface BetaJSONOutputFormat {
    /**
     * The JSON schema of the format
     */
    schema: {
        [key: string]: unknown;
    };
    type: 'json_schema';
}
/**
 * Configuration for a specific tool in an MCP toolset.
 */
export interface BetaMCPToolConfig {
    defer_loading?: boolean;
    enabled?: boolean;
}
/**
 * Default configuration for tools in an MCP toolset.
 */
export interface BetaMCPToolDefaultConfig {
    defer_loading?: boolean;
    enabled?: boolean;
}
export interface BetaMCPToolResultBlock {
    content: string | Array<BetaTextBlock>;
    is_error: boolean;
    tool_use_id: string;
    type: 'mcp_tool_result';
}
export interface BetaMCPToolUseBlock {
    id: string;
    input: unknown;
    /**
     * The name of the MCP tool
     */
    name: string;
    /**
     * The name of the MCP server
     */
    server_name: string;
    type: 'mcp_tool_use';
}
export interface BetaMCPToolUseBlockParam {
    id: string;
    input: unknown;
    name: string;
    /**
     * The name of the MCP server
     */
    server_name: string;
    type: 'mcp_tool_use';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
/**
 * Configuration for a group of tools from an MCP server.
 *
 * Allows configuring enabled status and defer_loading for all tools from an MCP
 * server, with optional per-tool overrides.
 */
export interface BetaMCPToolset {
    /**
     * Name of the MCP server to configure tools for
     */
    mcp_server_name: string;
    type: 'mcp_toolset';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * Configuration overrides for specific tools, keyed by tool name
     */
    configs?: {
        [key: string]: BetaMCPToolConfig;
    } | null;
    /**
     * Default configuration applied to all tools from this server
     */
    default_config?: BetaMCPToolDefaultConfig;
}
export interface BetaMemoryTool20250818 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'memory';
    type: 'memory_20250818';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export type BetaMemoryTool20250818Command = BetaMemoryTool20250818ViewCommand | BetaMemoryTool20250818CreateCommand | BetaMemoryTool20250818StrReplaceCommand | BetaMemoryTool20250818InsertCommand | BetaMemoryTool20250818DeleteCommand | BetaMemoryTool20250818RenameCommand;
export interface BetaMemoryTool20250818CreateCommand {
    /**
     * Command type identifier
     */
    command: 'create';
    /**
     * Content to write to the file
     */
    file_text: string;
    /**
     * Path where the file should be created
     */
    path: string;
}
export interface BetaMemoryTool20250818DeleteCommand {
    /**
     * Command type identifier
     */
    command: 'delete';
    /**
     * Path to the file or directory to delete
     */
    path: string;
}
export interface BetaMemoryTool20250818InsertCommand {
    /**
     * Command type identifier
     */
    command: 'insert';
    /**
     * Line number where text should be inserted
     */
    insert_line: number;
    /**
     * Text to insert at the specified line
     */
    insert_text: string;
    /**
     * Path to the file where text should be inserted
     */
    path: string;
}
export interface BetaMemoryTool20250818RenameCommand {
    /**
     * Command type identifier
     */
    command: 'rename';
    /**
     * New path for the file or directory
     */
    new_path: string;
    /**
     * Current path of the file or directory
     */
    old_path: string;
}
export interface BetaMemoryTool20250818StrReplaceCommand {
    /**
     * Command type identifier
     */
    command: 'str_replace';
    /**
     * Text to replace with
     */
    new_str: string;
    /**
     * Text to search for and replace
     */
    old_str: string;
    /**
     * Path to the file where text should be replaced
     */
    path: string;
}
export interface BetaMemoryTool20250818ViewCommand {
    /**
     * Command type identifier
     */
    command: 'view';
    /**
     * Path to directory or file to view
     */
    path: string;
    /**
     * Optional line range for viewing specific lines
     */
    view_range?: Array<number>;
}
export interface BetaMessage {
    /**
     * Unique object identifier.
     *
     * The format and length of IDs may change over time.
     */
    id: string;
    /**
     * Information about the container used in the request (for the code execution
     * tool)
     */
    container: BetaContainer | null;
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
    content: Array<BetaContentBlock>;
    /**
     * Context management response.
     *
     * Information about context management strategies applied during the request.
     */
    context_management: BetaContextManagementResponse | null;
    /**
     * The model that will complete your prompt.\n\nSee
     * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
     * details and options.
     */
    model: MessagesAPI.Model;
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
    stop_reason: BetaStopReason | null;
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
    usage: BetaUsage;
}
export interface BetaMessageDeltaUsage {
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
    server_tool_use: BetaServerToolUsage | null;
}
export interface BetaMessageParam {
    content: string | Array<BetaContentBlockParam>;
    role: 'user' | 'assistant';
}
export interface BetaMessageTokensCount {
    /**
     * Information about context management applied to the message.
     */
    context_management: BetaCountTokensContextManagementResponse | null;
    /**
     * The total number of tokens across the provided list of messages, system prompt,
     * and tools.
     */
    input_tokens: number;
}
export interface BetaMetadata {
    /**
     * An external identifier for the user who is associated with the request.
     *
     * This should be a uuid, hash value, or other opaque identifier. Anthropic may use
     * this id to help detect abuse. Do not include any identifying information such as
     * name, email address, or phone number.
     */
    user_id?: string | null;
}
export interface BetaOutputConfig {
    /**
     * All possible effort levels.
     */
    effort?: 'low' | 'medium' | 'high' | null;
}
export interface BetaPlainTextSource {
    data: string;
    media_type: 'text/plain';
    type: 'text';
}
export type BetaRawContentBlockDelta = BetaTextDelta | BetaInputJSONDelta | BetaCitationsDelta | BetaThinkingDelta | BetaSignatureDelta;
export interface BetaRawContentBlockDeltaEvent {
    delta: BetaRawContentBlockDelta;
    index: number;
    type: 'content_block_delta';
}
export interface BetaRawContentBlockStartEvent {
    /**
     * Response model for a file uploaded to the container.
     */
    content_block: BetaTextBlock | BetaThinkingBlock | BetaRedactedThinkingBlock | BetaToolUseBlock | BetaServerToolUseBlock | BetaWebSearchToolResultBlock | BetaWebFetchToolResultBlock | BetaCodeExecutionToolResultBlock | BetaBashCodeExecutionToolResultBlock | BetaTextEditorCodeExecutionToolResultBlock | BetaToolSearchToolResultBlock | BetaMCPToolUseBlock | BetaMCPToolResultBlock | BetaContainerUploadBlock;
    index: number;
    type: 'content_block_start';
}
export interface BetaRawContentBlockStopEvent {
    index: number;
    type: 'content_block_stop';
}
export interface BetaRawMessageDeltaEvent {
    /**
     * Information about context management strategies applied during the request
     */
    context_management: BetaContextManagementResponse | null;
    delta: BetaRawMessageDeltaEvent.Delta;
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
    usage: BetaMessageDeltaUsage;
}
export declare namespace BetaRawMessageDeltaEvent {
    interface Delta {
        /**
         * Information about the container used in the request (for the code execution
         * tool)
         */
        container: MessagesMessagesAPI.BetaContainer | null;
        stop_reason: MessagesMessagesAPI.BetaStopReason | null;
        stop_sequence: string | null;
    }
}
export interface BetaRawMessageStartEvent {
    message: BetaMessage;
    type: 'message_start';
}
export interface BetaRawMessageStopEvent {
    type: 'message_stop';
}
export type BetaRawMessageStreamEvent = BetaRawMessageStartEvent | BetaRawMessageDeltaEvent | BetaRawMessageStopEvent | BetaRawContentBlockStartEvent | BetaRawContentBlockDeltaEvent | BetaRawContentBlockStopEvent;
export interface BetaRedactedThinkingBlock {
    data: string;
    type: 'redacted_thinking';
}
export interface BetaRedactedThinkingBlockParam {
    data: string;
    type: 'redacted_thinking';
}
export interface BetaRequestDocumentBlock {
    source: BetaBase64PDFSource | BetaPlainTextSource | BetaContentBlockSource | BetaURLPDFSource | BetaFileDocumentSource;
    type: 'document';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    citations?: BetaCitationsConfigParam | null;
    context?: string | null;
    title?: string | null;
}
export interface BetaRequestMCPServerToolConfiguration {
    allowed_tools?: Array<string> | null;
    enabled?: boolean | null;
}
export interface BetaRequestMCPServerURLDefinition {
    name: string;
    type: 'url';
    url: string;
    authorization_token?: string | null;
    tool_configuration?: BetaRequestMCPServerToolConfiguration | null;
}
export interface BetaRequestMCPToolResultBlockParam {
    tool_use_id: string;
    type: 'mcp_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    content?: string | Array<BetaTextBlockParam>;
    is_error?: boolean;
}
export interface BetaSearchResultBlockParam {
    content: Array<BetaTextBlockParam>;
    source: string;
    title: string;
    type: 'search_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    citations?: BetaCitationsConfigParam;
}
/**
 * Tool invocation generated by a server-side tool.
 */
export interface BetaServerToolCaller {
    tool_id: string;
    type: 'code_execution_20250825';
}
export interface BetaServerToolUsage {
    /**
     * The number of web fetch tool requests.
     */
    web_fetch_requests: number;
    /**
     * The number of web search tool requests.
     */
    web_search_requests: number;
}
export interface BetaServerToolUseBlock {
    id: string;
    /**
     * Tool invocation directly from the model.
     */
    caller: BetaDirectCaller | BetaServerToolCaller;
    input: {
        [key: string]: unknown;
    };
    name: 'web_search' | 'web_fetch' | 'code_execution' | 'bash_code_execution' | 'text_editor_code_execution' | 'tool_search_tool_regex' | 'tool_search_tool_bm25';
    type: 'server_tool_use';
}
export interface BetaServerToolUseBlockParam {
    id: string;
    input: unknown;
    name: 'web_search' | 'web_fetch' | 'code_execution' | 'bash_code_execution' | 'text_editor_code_execution' | 'tool_search_tool_regex' | 'tool_search_tool_bm25';
    type: 'server_tool_use';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * Tool invocation directly from the model.
     */
    caller?: BetaDirectCaller | BetaServerToolCaller;
}
export interface BetaSignatureDelta {
    signature: string;
    type: 'signature_delta';
}
/**
 * A skill that was loaded in a container (response model).
 */
export interface BetaSkill {
    /**
     * Skill ID
     */
    skill_id: string;
    /**
     * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
     */
    type: 'anthropic' | 'custom';
    /**
     * Skill version or 'latest' for most recent version
     */
    version: string;
}
/**
 * Specification for a skill to be loaded in a container (request model).
 */
export interface BetaSkillParams {
    /**
     * Skill ID
     */
    skill_id: string;
    /**
     * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
     */
    type: 'anthropic' | 'custom';
    /**
     * Skill version or 'latest' for most recent version
     */
    version?: string;
}
export type BetaStopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal' | 'model_context_window_exceeded';
export interface BetaTextBlock {
    /**
     * Citations supporting the text block.
     *
     * The type of citation returned will depend on the type of document being cited.
     * Citing a PDF results in `page_location`, plain text results in `char_location`,
     * and content document results in `content_block_location`.
     */
    citations: Array<BetaTextCitation> | null;
    text: string;
    type: 'text';
}
export interface BetaTextBlockParam {
    text: string;
    type: 'text';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    citations?: Array<BetaTextCitationParam> | null;
}
export type BetaTextCitation = BetaCitationCharLocation | BetaCitationPageLocation | BetaCitationContentBlockLocation | BetaCitationsWebSearchResultLocation | BetaCitationSearchResultLocation;
export type BetaTextCitationParam = BetaCitationCharLocationParam | BetaCitationPageLocationParam | BetaCitationContentBlockLocationParam | BetaCitationWebSearchResultLocationParam | BetaCitationSearchResultLocationParam;
export interface BetaTextDelta {
    text: string;
    type: 'text_delta';
}
export interface BetaTextEditorCodeExecutionCreateResultBlock {
    is_file_update: boolean;
    type: 'text_editor_code_execution_create_result';
}
export interface BetaTextEditorCodeExecutionCreateResultBlockParam {
    is_file_update: boolean;
    type: 'text_editor_code_execution_create_result';
}
export interface BetaTextEditorCodeExecutionStrReplaceResultBlock {
    lines: Array<string> | null;
    new_lines: number | null;
    new_start: number | null;
    old_lines: number | null;
    old_start: number | null;
    type: 'text_editor_code_execution_str_replace_result';
}
export interface BetaTextEditorCodeExecutionStrReplaceResultBlockParam {
    type: 'text_editor_code_execution_str_replace_result';
    lines?: Array<string> | null;
    new_lines?: number | null;
    new_start?: number | null;
    old_lines?: number | null;
    old_start?: number | null;
}
export interface BetaTextEditorCodeExecutionToolResultBlock {
    content: BetaTextEditorCodeExecutionToolResultError | BetaTextEditorCodeExecutionViewResultBlock | BetaTextEditorCodeExecutionCreateResultBlock | BetaTextEditorCodeExecutionStrReplaceResultBlock;
    tool_use_id: string;
    type: 'text_editor_code_execution_tool_result';
}
export interface BetaTextEditorCodeExecutionToolResultBlockParam {
    content: BetaTextEditorCodeExecutionToolResultErrorParam | BetaTextEditorCodeExecutionViewResultBlockParam | BetaTextEditorCodeExecutionCreateResultBlockParam | BetaTextEditorCodeExecutionStrReplaceResultBlockParam;
    tool_use_id: string;
    type: 'text_editor_code_execution_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaTextEditorCodeExecutionToolResultError {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded' | 'file_not_found';
    error_message: string | null;
    type: 'text_editor_code_execution_tool_result_error';
}
export interface BetaTextEditorCodeExecutionToolResultErrorParam {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded' | 'file_not_found';
    type: 'text_editor_code_execution_tool_result_error';
    error_message?: string | null;
}
export interface BetaTextEditorCodeExecutionViewResultBlock {
    content: string;
    file_type: 'text' | 'image' | 'pdf';
    num_lines: number | null;
    start_line: number | null;
    total_lines: number | null;
    type: 'text_editor_code_execution_view_result';
}
export interface BetaTextEditorCodeExecutionViewResultBlockParam {
    content: string;
    file_type: 'text' | 'image' | 'pdf';
    type: 'text_editor_code_execution_view_result';
    num_lines?: number | null;
    start_line?: number | null;
    total_lines?: number | null;
}
export interface BetaThinkingBlock {
    signature: string;
    thinking: string;
    type: 'thinking';
}
export interface BetaThinkingBlockParam {
    signature: string;
    thinking: string;
    type: 'thinking';
}
export interface BetaThinkingConfigDisabled {
    type: 'disabled';
}
export interface BetaThinkingConfigEnabled {
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
export type BetaThinkingConfigParam = BetaThinkingConfigEnabled | BetaThinkingConfigDisabled;
export interface BetaThinkingDelta {
    thinking: string;
    type: 'thinking_delta';
}
export interface BetaThinkingTurns {
    type: 'thinking_turns';
    value: number;
}
export interface BetaTool {
    /**
     * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
     *
     * This defines the shape of the `input` that your tool accepts and that the model
     * will produce.
     */
    input_schema: BetaTool.InputSchema;
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: string;
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * Description of what this tool does.
     *
     * Tool descriptions should be as detailed as possible. The more information that
     * the model has about what the tool is and how to use it, the better it will
     * perform. You can use natural language descriptions to reinforce important
     * aspects of the tool input JSON schema.
     */
    description?: string;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
    type?: 'custom' | null;
}
export declare namespace BetaTool {
    /**
     * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
     *
     * This defines the shape of the `input` that your tool accepts and that the model
     * will produce.
     */
    interface InputSchema {
        type: 'object';
        properties?: unknown | null;
        required?: string[] | readonly string[] | null;
        [k: string]: unknown;
    }
}
export interface BetaToolBash20241022 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'bash';
    type: 'bash_20241022';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolBash20250124 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'bash';
    type: 'bash_20250124';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
/**
 * How the model should use the provided tools. The model can use a specific tool,
 * any available tool, decide by itself, or not use tools at all.
 */
export type BetaToolChoice = BetaToolChoiceAuto | BetaToolChoiceAny | BetaToolChoiceTool | BetaToolChoiceNone;
/**
 * The model will use any available tools.
 */
export interface BetaToolChoiceAny {
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
export interface BetaToolChoiceAuto {
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
export interface BetaToolChoiceNone {
    type: 'none';
}
/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export interface BetaToolChoiceTool {
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
export interface BetaToolComputerUse20241022 {
    /**
     * The height of the display in pixels.
     */
    display_height_px: number;
    /**
     * The width of the display in pixels.
     */
    display_width_px: number;
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'computer';
    type: 'computer_20241022';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * The X11 display number (e.g. 0, 1) for the display.
     */
    display_number?: number | null;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolComputerUse20250124 {
    /**
     * The height of the display in pixels.
     */
    display_height_px: number;
    /**
     * The width of the display in pixels.
     */
    display_width_px: number;
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'computer';
    type: 'computer_20250124';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * The X11 display number (e.g. 0, 1) for the display.
     */
    display_number?: number | null;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolComputerUse20251124 {
    /**
     * The height of the display in pixels.
     */
    display_height_px: number;
    /**
     * The width of the display in pixels.
     */
    display_width_px: number;
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'computer';
    type: 'computer_20251124';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * The X11 display number (e.g. 0, 1) for the display.
     */
    display_number?: number | null;
    /**
     * Whether to enable an action to take a zoomed-in screenshot of the screen.
     */
    enable_zoom?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolReferenceBlock {
    tool_name: string;
    type: 'tool_reference';
}
/**
 * Tool reference block that can be included in tool_result content.
 */
export interface BetaToolReferenceBlockParam {
    tool_name: string;
    type: 'tool_reference';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaToolResultBlockParam {
    tool_use_id: string;
    type: 'tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    content?: string | Array<BetaTextBlockParam | BetaImageBlockParam | BetaSearchResultBlockParam | BetaRequestDocumentBlock | BetaToolReferenceBlockParam>;
    is_error?: boolean;
}
export interface BetaToolSearchToolBm25_20251119 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'tool_search_tool_bm25';
    type: 'tool_search_tool_bm25_20251119' | 'tool_search_tool_bm25';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    strict?: boolean;
}
export interface BetaToolSearchToolRegex20251119 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'tool_search_tool_regex';
    type: 'tool_search_tool_regex_20251119' | 'tool_search_tool_regex';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    strict?: boolean;
}
export interface BetaToolSearchToolResultBlock {
    content: BetaToolSearchToolResultError | BetaToolSearchToolSearchResultBlock;
    tool_use_id: string;
    type: 'tool_search_tool_result';
}
export interface BetaToolSearchToolResultBlockParam {
    content: BetaToolSearchToolResultErrorParam | BetaToolSearchToolSearchResultBlockParam;
    tool_use_id: string;
    type: 'tool_search_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaToolSearchToolResultError {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded';
    error_message: string | null;
    type: 'tool_search_tool_result_error';
}
export interface BetaToolSearchToolResultErrorParam {
    error_code: 'invalid_tool_input' | 'unavailable' | 'too_many_requests' | 'execution_time_exceeded';
    type: 'tool_search_tool_result_error';
}
export interface BetaToolSearchToolSearchResultBlock {
    tool_references: Array<BetaToolReferenceBlock>;
    type: 'tool_search_tool_search_result';
}
export interface BetaToolSearchToolSearchResultBlockParam {
    tool_references: Array<BetaToolReferenceBlockParam>;
    type: 'tool_search_tool_search_result';
}
export type BetaToolResultContentBlockParam = Extract<BetaToolResultBlockParam['content'], any[]>[number];
export interface BetaToolTextEditor20241022 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'str_replace_editor';
    type: 'text_editor_20241022';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolTextEditor20250124 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'str_replace_editor';
    type: 'text_editor_20250124';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolTextEditor20250429 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'str_replace_based_edit_tool';
    type: 'text_editor_20250429';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    strict?: boolean;
}
export interface BetaToolTextEditor20250728 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'str_replace_based_edit_tool';
    type: 'text_editor_20250728';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    input_examples?: Array<{
        [key: string]: unknown;
    }>;
    /**
     * Maximum number of characters to display when viewing a file. If not specified,
     * defaults to displaying the full file.
     */
    max_characters?: number | null;
    strict?: boolean;
}
/**
 * Configuration for a group of tools from an MCP server.
 *
 * Allows configuring enabled status and defer_loading for all tools from an MCP
 * server, with optional per-tool overrides.
 */
export type BetaToolUnion = BetaTool | BetaToolBash20241022 | BetaToolBash20250124 | BetaCodeExecutionTool20250522 | BetaCodeExecutionTool20250825 | BetaToolComputerUse20241022 | BetaMemoryTool20250818 | BetaToolComputerUse20250124 | BetaToolTextEditor20241022 | BetaToolComputerUse20251124 | BetaToolTextEditor20250124 | BetaToolTextEditor20250429 | BetaToolTextEditor20250728 | BetaWebSearchTool20250305 | BetaWebFetchTool20250910 | BetaToolSearchToolBm25_20251119 | BetaToolSearchToolRegex20251119 | BetaMCPToolset;
export interface BetaToolUseBlock {
    id: string;
    input: unknown;
    name: string;
    type: 'tool_use';
    /**
     * Tool invocation directly from the model.
     */
    caller?: BetaDirectCaller | BetaServerToolCaller;
}
export interface BetaToolUseBlockParam {
    id: string;
    input: unknown;
    name: string;
    type: 'tool_use';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * Tool invocation directly from the model.
     */
    caller?: BetaDirectCaller | BetaServerToolCaller;
}
export interface BetaToolUsesKeep {
    type: 'tool_uses';
    value: number;
}
export interface BetaToolUsesTrigger {
    type: 'tool_uses';
    value: number;
}
export interface BetaURLImageSource {
    type: 'url';
    url: string;
}
export interface BetaURLPDFSource {
    type: 'url';
    url: string;
}
export interface BetaUsage {
    /**
     * Breakdown of cached tokens by TTL
     */
    cache_creation: BetaCacheCreation | null;
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
    server_tool_use: BetaServerToolUsage | null;
    /**
     * If the request used the priority, standard, or batch tier.
     */
    service_tier: 'standard' | 'priority' | 'batch' | null;
}
export interface BetaWebFetchBlock {
    content: BetaDocumentBlock;
    /**
     * ISO 8601 timestamp when the content was retrieved
     */
    retrieved_at: string | null;
    type: 'web_fetch_result';
    /**
     * Fetched content URL
     */
    url: string;
}
export interface BetaWebFetchBlockParam {
    content: BetaRequestDocumentBlock;
    type: 'web_fetch_result';
    /**
     * Fetched content URL
     */
    url: string;
    /**
     * ISO 8601 timestamp when the content was retrieved
     */
    retrieved_at?: string | null;
}
export interface BetaWebFetchTool20250910 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'web_fetch';
    type: 'web_fetch_20250910';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
    /**
     * List of domains to allow fetching from
     */
    allowed_domains?: Array<string> | null;
    /**
     * List of domains to block fetching from
     */
    blocked_domains?: Array<string> | null;
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * Citations configuration for fetched documents. Citations are disabled by
     * default.
     */
    citations?: BetaCitationsConfigParam | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * Maximum number of tokens used by including web page text content in the context.
     * The limit is approximate and does not apply to binary content such as PDFs.
     */
    max_content_tokens?: number | null;
    /**
     * Maximum number of times the tool can be used in the API request.
     */
    max_uses?: number | null;
    strict?: boolean;
}
export interface BetaWebFetchToolResultBlock {
    content: BetaWebFetchToolResultErrorBlock | BetaWebFetchBlock;
    tool_use_id: string;
    type: 'web_fetch_tool_result';
}
export interface BetaWebFetchToolResultBlockParam {
    content: BetaWebFetchToolResultErrorBlockParam | BetaWebFetchBlockParam;
    tool_use_id: string;
    type: 'web_fetch_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export interface BetaWebFetchToolResultErrorBlock {
    error_code: BetaWebFetchToolResultErrorCode;
    type: 'web_fetch_tool_result_error';
}
export interface BetaWebFetchToolResultErrorBlockParam {
    error_code: BetaWebFetchToolResultErrorCode;
    type: 'web_fetch_tool_result_error';
}
export type BetaWebFetchToolResultErrorCode = 'invalid_tool_input' | 'url_too_long' | 'url_not_allowed' | 'url_not_accessible' | 'unsupported_content_type' | 'too_many_requests' | 'max_uses_exceeded' | 'unavailable';
export interface BetaWebSearchResultBlock {
    encrypted_content: string;
    page_age: string | null;
    title: string;
    type: 'web_search_result';
    url: string;
}
export interface BetaWebSearchResultBlockParam {
    encrypted_content: string;
    title: string;
    type: 'web_search_result';
    url: string;
    page_age?: string | null;
}
export interface BetaWebSearchTool20250305 {
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    name: 'web_search';
    type: 'web_search_20250305';
    allowed_callers?: Array<'direct' | 'code_execution_20250825'>;
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
    cache_control?: BetaCacheControlEphemeral | null;
    /**
     * If true, tool will not be included in initial system prompt. Only loaded when
     * returned via tool_reference from tool search.
     */
    defer_loading?: boolean;
    /**
     * Maximum number of times the tool can be used in the API request.
     */
    max_uses?: number | null;
    strict?: boolean;
    /**
     * Parameters for the user's location. Used to provide more relevant search
     * results.
     */
    user_location?: BetaWebSearchTool20250305.UserLocation | null;
}
export declare namespace BetaWebSearchTool20250305 {
    /**
     * Parameters for the user's location. Used to provide more relevant search
     * results.
     */
    interface UserLocation {
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
export interface BetaWebSearchToolRequestError {
    error_code: BetaWebSearchToolResultErrorCode;
    type: 'web_search_tool_result_error';
}
export interface BetaWebSearchToolResultBlock {
    content: BetaWebSearchToolResultBlockContent;
    tool_use_id: string;
    type: 'web_search_tool_result';
}
export type BetaWebSearchToolResultBlockContent = BetaWebSearchToolResultError | Array<BetaWebSearchResultBlock>;
export interface BetaWebSearchToolResultBlockParam {
    content: BetaWebSearchToolResultBlockParamContent;
    tool_use_id: string;
    type: 'web_search_tool_result';
    /**
     * Create a cache control breakpoint at this content block.
     */
    cache_control?: BetaCacheControlEphemeral | null;
}
export type BetaWebSearchToolResultBlockParamContent = Array<BetaWebSearchResultBlockParam> | BetaWebSearchToolRequestError;
export interface BetaWebSearchToolResultError {
    error_code: BetaWebSearchToolResultErrorCode;
    type: 'web_search_tool_result_error';
}
export type BetaWebSearchToolResultErrorCode = 'invalid_tool_input' | 'unavailable' | 'max_uses_exceeded' | 'too_many_requests' | 'query_too_long';
/**
 * @deprecated BetaRequestDocumentBlock should be used insated
 */
export type BetaBase64PDFBlock = BetaRequestDocumentBlock;
export type MessageCreateParams = MessageCreateParamsNonStreaming | MessageCreateParamsStreaming;
export interface MessageCreateParamsBase {
    /**
     * Body param: The maximum number of tokens to generate before stopping.
     *
     * Note that our models may stop _before_ reaching this maximum. This parameter
     * only specifies the absolute maximum number of tokens to generate.
     *
     * Different models have different maximum values for this parameter. See
     * [models](https://docs.claude.com/en/docs/models-overview) for details.
     */
    max_tokens: number;
    /**
     * Body param: Input messages.
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
    messages: Array<BetaMessageParam>;
    /**
     * Body param: The model that will complete your prompt.\n\nSee
     * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
     * details and options.
     */
    model: MessagesAPI.Model;
    /**
     * Body param: Container identifier for reuse across requests.
     */
    container?: BetaContainerParams | string | null;
    /**
     * Body param: Context management configuration.
     *
     * This allows you to control how Claude manages context across multiple requests,
     * such as whether to clear function results or not.
     */
    context_management?: BetaContextManagementConfig | null;
    /**
     * Body param: MCP servers to be utilized in this request
     */
    mcp_servers?: Array<BetaRequestMCPServerURLDefinition>;
    /**
     * Body param: An object describing metadata about the request.
     */
    metadata?: BetaMetadata;
    /**
     * Body param: Configuration options for the model's output. Controls aspects like
     * how much effort the model puts into its response.
     */
    output_config?: BetaOutputConfig;
    /**
     * Body param: A schema to specify Claude's output format in responses.
     */
    output_format?: BetaJSONOutputFormat | null;
    /**
     * Body param: Determines whether to use priority capacity (if available) or
     * standard capacity for this request.
     *
     * Anthropic offers different levels of service for your API requests. See
     * [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
     */
    service_tier?: 'auto' | 'standard_only';
    /**
     * Body param: Custom text sequences that will cause the model to stop generating.
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
     * Body param: Whether to incrementally stream the response using server-sent
     * events.
     *
     * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
     */
    stream?: boolean;
    /**
     * Body param: System prompt.
     *
     * A system prompt is a way of providing context and instructions to Claude, such
     * as specifying a particular goal or role. See our
     * [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
     */
    system?: string | Array<BetaTextBlockParam>;
    /**
     * Body param: Amount of randomness injected into the response.
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
     * Body param: Configuration for enabling Claude's extended thinking.
     *
     * When enabled, responses include `thinking` content blocks showing Claude's
     * thinking process before the final answer. Requires a minimum budget of 1,024
     * tokens and counts towards your `max_tokens` limit.
     *
     * See
     * [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
     * for details.
     */
    thinking?: BetaThinkingConfigParam;
    /**
     * Body param: How the model should use the provided tools. The model can use a
     * specific tool, any available tool, decide by itself, or not use tools at all.
     */
    tool_choice?: BetaToolChoice;
    /**
     * Body param: Definitions of tools that the model may use.
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
    tools?: Array<BetaToolUnion>;
    /**
     * Body param: Only sample from the top K options for each subsequent token.
     *
     * Used to remove "long tail" low probability responses.
     * [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).
     *
     * Recommended for advanced use cases only. You usually only need to use
     * `temperature`.
     */
    top_k?: number;
    /**
     * Body param: Use nucleus sampling.
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
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export declare namespace MessageCreateParams {
    type MessageCreateParamsNonStreaming = MessagesMessagesAPI.MessageCreateParamsNonStreaming;
    type MessageCreateParamsStreaming = MessagesMessagesAPI.MessageCreateParamsStreaming;
}
export interface MessageCreateParamsNonStreaming extends MessageCreateParamsBase {
    /**
     * Body param: Whether to incrementally stream the response using server-sent
     * events.
     *
     * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
     */
    stream?: false;
}
export interface MessageCreateParamsStreaming extends MessageCreateParamsBase {
    /**
     * Body param: Whether to incrementally stream the response using server-sent
     * events.
     *
     * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
     */
    stream: true;
}
export interface MessageCountTokensParams {
    /**
     * Body param: Input messages.
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
    messages: Array<BetaMessageParam>;
    /**
     * Body param: The model that will complete your prompt.\n\nSee
     * [models](https://docs.anthropic.com/en/docs/models-overview) for additional
     * details and options.
     */
    model: MessagesAPI.Model;
    /**
     * Body param: Context management configuration.
     *
     * This allows you to control how Claude manages context across multiple requests,
     * such as whether to clear function results or not.
     */
    context_management?: BetaContextManagementConfig | null;
    /**
     * Body param: MCP servers to be utilized in this request
     */
    mcp_servers?: Array<BetaRequestMCPServerURLDefinition>;
    /**
     * Body param: Configuration options for the model's output. Controls aspects like
     * how much effort the model puts into its response.
     */
    output_config?: BetaOutputConfig;
    /**
     * Body param: A schema to specify Claude's output format in responses.
     */
    output_format?: BetaJSONOutputFormat | null;
    /**
     * Body param: System prompt.
     *
     * A system prompt is a way of providing context and instructions to Claude, such
     * as specifying a particular goal or role. See our
     * [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
     */
    system?: string | Array<BetaTextBlockParam>;
    /**
     * Body param: Configuration for enabling Claude's extended thinking.
     *
     * When enabled, responses include `thinking` content blocks showing Claude's
     * thinking process before the final answer. Requires a minimum budget of 1,024
     * tokens and counts towards your `max_tokens` limit.
     *
     * See
     * [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
     * for details.
     */
    thinking?: BetaThinkingConfigParam;
    /**
     * Body param: How the model should use the provided tools. The model can use a
     * specific tool, any available tool, decide by itself, or not use tools at all.
     */
    tool_choice?: BetaToolChoice;
    /**
     * Body param: Definitions of tools that the model may use.
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
    tools?: Array<BetaTool | BetaToolBash20241022 | BetaToolBash20250124 | BetaCodeExecutionTool20250522 | BetaCodeExecutionTool20250825 | BetaToolComputerUse20241022 | BetaMemoryTool20250818 | BetaToolComputerUse20250124 | BetaToolTextEditor20241022 | BetaToolComputerUse20251124 | BetaToolTextEditor20250124 | BetaToolTextEditor20250429 | BetaToolTextEditor20250728 | BetaWebSearchTool20250305 | BetaWebFetchTool20250910 | BetaToolSearchToolBm25_20251119 | BetaToolSearchToolRegex20251119 | BetaMCPToolset>;
    /**
     * Header param: Optional header to specify the beta version(s) you want to use.
     */
    betas?: Array<BetaAPI.AnthropicBeta>;
}
export { BetaToolRunner, type BetaToolRunnerParams } from "../../../lib/tools/BetaToolRunner.js";
export declare namespace Messages {
    export { type BetaAllThinkingTurns as BetaAllThinkingTurns, type BetaBase64ImageSource as BetaBase64ImageSource, type BetaBase64PDFSource as BetaBase64PDFSource, type BetaBashCodeExecutionOutputBlock as BetaBashCodeExecutionOutputBlock, type BetaBashCodeExecutionOutputBlockParam as BetaBashCodeExecutionOutputBlockParam, type BetaBashCodeExecutionResultBlock as BetaBashCodeExecutionResultBlock, type BetaBashCodeExecutionResultBlockParam as BetaBashCodeExecutionResultBlockParam, type BetaBashCodeExecutionToolResultBlock as BetaBashCodeExecutionToolResultBlock, type BetaBashCodeExecutionToolResultBlockParam as BetaBashCodeExecutionToolResultBlockParam, type BetaBashCodeExecutionToolResultError as BetaBashCodeExecutionToolResultError, type BetaBashCodeExecutionToolResultErrorParam as BetaBashCodeExecutionToolResultErrorParam, type BetaCacheControlEphemeral as BetaCacheControlEphemeral, type BetaCacheCreation as BetaCacheCreation, type BetaCitationCharLocation as BetaCitationCharLocation, type BetaCitationCharLocationParam as BetaCitationCharLocationParam, type BetaCitationConfig as BetaCitationConfig, type BetaCitationContentBlockLocation as BetaCitationContentBlockLocation, type BetaCitationContentBlockLocationParam as BetaCitationContentBlockLocationParam, type BetaCitationPageLocation as BetaCitationPageLocation, type BetaCitationPageLocationParam as BetaCitationPageLocationParam, type BetaCitationSearchResultLocation as BetaCitationSearchResultLocation, type BetaCitationSearchResultLocationParam as BetaCitationSearchResultLocationParam, type BetaCitationWebSearchResultLocationParam as BetaCitationWebSearchResultLocationParam, type BetaCitationsConfigParam as BetaCitationsConfigParam, type BetaCitationsDelta as BetaCitationsDelta, type BetaCitationsWebSearchResultLocation as BetaCitationsWebSearchResultLocation, type BetaClearThinking20251015Edit as BetaClearThinking20251015Edit, type BetaClearThinking20251015EditResponse as BetaClearThinking20251015EditResponse, type BetaClearToolUses20250919Edit as BetaClearToolUses20250919Edit, type BetaClearToolUses20250919EditResponse as BetaClearToolUses20250919EditResponse, type BetaCodeExecutionOutputBlock as BetaCodeExecutionOutputBlock, type BetaCodeExecutionOutputBlockParam as BetaCodeExecutionOutputBlockParam, type BetaCodeExecutionResultBlock as BetaCodeExecutionResultBlock, type BetaCodeExecutionResultBlockParam as BetaCodeExecutionResultBlockParam, type BetaCodeExecutionTool20250522 as BetaCodeExecutionTool20250522, type BetaCodeExecutionTool20250825 as BetaCodeExecutionTool20250825, type BetaCodeExecutionToolResultBlock as BetaCodeExecutionToolResultBlock, type BetaCodeExecutionToolResultBlockContent as BetaCodeExecutionToolResultBlockContent, type BetaCodeExecutionToolResultBlockParam as BetaCodeExecutionToolResultBlockParam, type BetaCodeExecutionToolResultBlockParamContent as BetaCodeExecutionToolResultBlockParamContent, type BetaCodeExecutionToolResultError as BetaCodeExecutionToolResultError, type BetaCodeExecutionToolResultErrorCode as BetaCodeExecutionToolResultErrorCode, type BetaCodeExecutionToolResultErrorParam as BetaCodeExecutionToolResultErrorParam, type BetaContainer as BetaContainer, type BetaContainerParams as BetaContainerParams, type BetaContainerUploadBlock as BetaContainerUploadBlock, type BetaContainerUploadBlockParam as BetaContainerUploadBlockParam, type BetaContentBlock as BetaContentBlock, type BetaContentBlockParam as BetaContentBlockParam, type BetaContentBlockSource as BetaContentBlockSource, type BetaContentBlockSourceContent as BetaContentBlockSourceContent, type BetaContextManagementConfig as BetaContextManagementConfig, type BetaContextManagementResponse as BetaContextManagementResponse, type BetaCountTokensContextManagementResponse as BetaCountTokensContextManagementResponse, type BetaDirectCaller as BetaDirectCaller, type BetaDocumentBlock as BetaDocumentBlock, type BetaFileDocumentSource as BetaFileDocumentSource, type BetaFileImageSource as BetaFileImageSource, type BetaImageBlockParam as BetaImageBlockParam, type BetaInputJSONDelta as BetaInputJSONDelta, type BetaInputTokensClearAtLeast as BetaInputTokensClearAtLeast, type BetaInputTokensTrigger as BetaInputTokensTrigger, type BetaJSONOutputFormat as BetaJSONOutputFormat, type BetaMCPToolConfig as BetaMCPToolConfig, type BetaMCPToolDefaultConfig as BetaMCPToolDefaultConfig, type BetaMCPToolResultBlock as BetaMCPToolResultBlock, type BetaMCPToolUseBlock as BetaMCPToolUseBlock, type BetaMCPToolUseBlockParam as BetaMCPToolUseBlockParam, type BetaMCPToolset as BetaMCPToolset, type BetaMemoryTool20250818 as BetaMemoryTool20250818, type BetaMemoryTool20250818Command as BetaMemoryTool20250818Command, type BetaMemoryTool20250818CreateCommand as BetaMemoryTool20250818CreateCommand, type BetaMemoryTool20250818DeleteCommand as BetaMemoryTool20250818DeleteCommand, type BetaMemoryTool20250818InsertCommand as BetaMemoryTool20250818InsertCommand, type BetaMemoryTool20250818RenameCommand as BetaMemoryTool20250818RenameCommand, type BetaMemoryTool20250818StrReplaceCommand as BetaMemoryTool20250818StrReplaceCommand, type BetaMemoryTool20250818ViewCommand as BetaMemoryTool20250818ViewCommand, type BetaMessage as BetaMessage, type BetaMessageDeltaUsage as BetaMessageDeltaUsage, type BetaMessageParam as BetaMessageParam, type BetaMessageTokensCount as BetaMessageTokensCount, type BetaMetadata as BetaMetadata, type BetaOutputConfig as BetaOutputConfig, type BetaPlainTextSource as BetaPlainTextSource, type BetaRawContentBlockDelta as BetaRawContentBlockDelta, type BetaRawContentBlockDeltaEvent as BetaRawContentBlockDeltaEvent, type BetaRawContentBlockStartEvent as BetaRawContentBlockStartEvent, type BetaRawContentBlockStopEvent as BetaRawContentBlockStopEvent, type BetaRawMessageDeltaEvent as BetaRawMessageDeltaEvent, type BetaRawMessageStartEvent as BetaRawMessageStartEvent, type BetaRawMessageStopEvent as BetaRawMessageStopEvent, type BetaRawMessageStreamEvent as BetaRawMessageStreamEvent, type BetaRedactedThinkingBlock as BetaRedactedThinkingBlock, type BetaRedactedThinkingBlockParam as BetaRedactedThinkingBlockParam, type BetaRequestDocumentBlock as BetaRequestDocumentBlock, type BetaRequestMCPServerToolConfiguration as BetaRequestMCPServerToolConfiguration, type BetaRequestMCPServerURLDefinition as BetaRequestMCPServerURLDefinition, type BetaRequestMCPToolResultBlockParam as BetaRequestMCPToolResultBlockParam, type BetaSearchResultBlockParam as BetaSearchResultBlockParam, type BetaServerToolCaller as BetaServerToolCaller, type BetaServerToolUsage as BetaServerToolUsage, type BetaServerToolUseBlock as BetaServerToolUseBlock, type BetaServerToolUseBlockParam as BetaServerToolUseBlockParam, type BetaSignatureDelta as BetaSignatureDelta, type BetaSkill as BetaSkill, type BetaSkillParams as BetaSkillParams, type BetaStopReason as BetaStopReason, type BetaTextBlock as BetaTextBlock, type BetaTextBlockParam as BetaTextBlockParam, type BetaTextCitation as BetaTextCitation, type BetaTextCitationParam as BetaTextCitationParam, type BetaTextDelta as BetaTextDelta, type BetaTextEditorCodeExecutionCreateResultBlock as BetaTextEditorCodeExecutionCreateResultBlock, type BetaTextEditorCodeExecutionCreateResultBlockParam as BetaTextEditorCodeExecutionCreateResultBlockParam, type BetaTextEditorCodeExecutionStrReplaceResultBlock as BetaTextEditorCodeExecutionStrReplaceResultBlock, type BetaTextEditorCodeExecutionStrReplaceResultBlockParam as BetaTextEditorCodeExecutionStrReplaceResultBlockParam, type BetaTextEditorCodeExecutionToolResultBlock as BetaTextEditorCodeExecutionToolResultBlock, type BetaTextEditorCodeExecutionToolResultBlockParam as BetaTextEditorCodeExecutionToolResultBlockParam, type BetaTextEditorCodeExecutionToolResultError as BetaTextEditorCodeExecutionToolResultError, type BetaTextEditorCodeExecutionToolResultErrorParam as BetaTextEditorCodeExecutionToolResultErrorParam, type BetaTextEditorCodeExecutionViewResultBlock as BetaTextEditorCodeExecutionViewResultBlock, type BetaTextEditorCodeExecutionViewResultBlockParam as BetaTextEditorCodeExecutionViewResultBlockParam, type BetaThinkingBlock as BetaThinkingBlock, type BetaThinkingBlockParam as BetaThinkingBlockParam, type BetaThinkingConfigDisabled as BetaThinkingConfigDisabled, type BetaThinkingConfigEnabled as BetaThinkingConfigEnabled, type BetaThinkingConfigParam as BetaThinkingConfigParam, type BetaThinkingDelta as BetaThinkingDelta, type BetaThinkingTurns as BetaThinkingTurns, type BetaTool as BetaTool, type BetaToolBash20241022 as BetaToolBash20241022, type BetaToolBash20250124 as BetaToolBash20250124, type BetaToolChoice as BetaToolChoice, type BetaToolChoiceAny as BetaToolChoiceAny, type BetaToolChoiceAuto as BetaToolChoiceAuto, type BetaToolChoiceNone as BetaToolChoiceNone, type BetaToolChoiceTool as BetaToolChoiceTool, type BetaToolComputerUse20241022 as BetaToolComputerUse20241022, type BetaToolComputerUse20250124 as BetaToolComputerUse20250124, type BetaToolComputerUse20251124 as BetaToolComputerUse20251124, type BetaToolReferenceBlock as BetaToolReferenceBlock, type BetaToolReferenceBlockParam as BetaToolReferenceBlockParam, type BetaToolResultBlockParam as BetaToolResultBlockParam, type BetaToolResultContentBlockParam as BetaToolResultContentBlockParam, type BetaToolSearchToolBm25_20251119 as BetaToolSearchToolBm25_20251119, type BetaToolSearchToolRegex20251119 as BetaToolSearchToolRegex20251119, type BetaToolSearchToolResultBlock as BetaToolSearchToolResultBlock, type BetaToolSearchToolResultBlockParam as BetaToolSearchToolResultBlockParam, type BetaToolSearchToolResultError as BetaToolSearchToolResultError, type BetaToolSearchToolResultErrorParam as BetaToolSearchToolResultErrorParam, type BetaToolSearchToolSearchResultBlock as BetaToolSearchToolSearchResultBlock, type BetaToolSearchToolSearchResultBlockParam as BetaToolSearchToolSearchResultBlockParam, type BetaToolTextEditor20241022 as BetaToolTextEditor20241022, type BetaToolTextEditor20250124 as BetaToolTextEditor20250124, type BetaToolTextEditor20250429 as BetaToolTextEditor20250429, type BetaToolTextEditor20250728 as BetaToolTextEditor20250728, type BetaToolUnion as BetaToolUnion, type BetaToolUseBlock as BetaToolUseBlock, type BetaToolUseBlockParam as BetaToolUseBlockParam, type BetaToolUsesKeep as BetaToolUsesKeep, type BetaToolUsesTrigger as BetaToolUsesTrigger, type BetaURLImageSource as BetaURLImageSource, type BetaURLPDFSource as BetaURLPDFSource, type BetaUsage as BetaUsage, type BetaWebFetchBlock as BetaWebFetchBlock, type BetaWebFetchBlockParam as BetaWebFetchBlockParam, type BetaWebFetchTool20250910 as BetaWebFetchTool20250910, type BetaWebFetchToolResultBlock as BetaWebFetchToolResultBlock, type BetaWebFetchToolResultBlockParam as BetaWebFetchToolResultBlockParam, type BetaWebFetchToolResultErrorBlock as BetaWebFetchToolResultErrorBlock, type BetaWebFetchToolResultErrorBlockParam as BetaWebFetchToolResultErrorBlockParam, type BetaWebFetchToolResultErrorCode as BetaWebFetchToolResultErrorCode, type BetaWebSearchResultBlock as BetaWebSearchResultBlock, type BetaWebSearchResultBlockParam as BetaWebSearchResultBlockParam, type BetaWebSearchTool20250305 as BetaWebSearchTool20250305, type BetaWebSearchToolRequestError as BetaWebSearchToolRequestError, type BetaWebSearchToolResultBlock as BetaWebSearchToolResultBlock, type BetaWebSearchToolResultBlockContent as BetaWebSearchToolResultBlockContent, type BetaWebSearchToolResultBlockParam as BetaWebSearchToolResultBlockParam, type BetaWebSearchToolResultBlockParamContent as BetaWebSearchToolResultBlockParamContent, type BetaWebSearchToolResultError as BetaWebSearchToolResultError, type BetaWebSearchToolResultErrorCode as BetaWebSearchToolResultErrorCode, type BetaBase64PDFBlock as BetaBase64PDFBlock, type MessageCreateParams as MessageCreateParams, type MessageCreateParamsNonStreaming as MessageCreateParamsNonStreaming, type MessageCreateParamsStreaming as MessageCreateParamsStreaming, type MessageCountTokensParams as MessageCountTokensParams, };
    export { type BetaToolRunnerParams, BetaToolRunner };
    export { Batches as Batches, type BetaDeletedMessageBatch as BetaDeletedMessageBatch, type BetaMessageBatch as BetaMessageBatch, type BetaMessageBatchCanceledResult as BetaMessageBatchCanceledResult, type BetaMessageBatchErroredResult as BetaMessageBatchErroredResult, type BetaMessageBatchExpiredResult as BetaMessageBatchExpiredResult, type BetaMessageBatchIndividualResponse as BetaMessageBatchIndividualResponse, type BetaMessageBatchRequestCounts as BetaMessageBatchRequestCounts, type BetaMessageBatchResult as BetaMessageBatchResult, type BetaMessageBatchSucceededResult as BetaMessageBatchSucceededResult, type BetaMessageBatchesPage as BetaMessageBatchesPage, type BatchCreateParams as BatchCreateParams, type BatchRetrieveParams as BatchRetrieveParams, type BatchListParams as BatchListParams, type BatchDeleteParams as BatchDeleteParams, type BatchCancelParams as BatchCancelParams, type BatchResultsParams as BatchResultsParams, };
}
//# sourceMappingURL=messages.d.ts.map