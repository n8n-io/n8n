import { type ExtractParsedContentFromParams, type ResponseCreateParamsWithTools } from "../../lib/ResponsesParser.js";
import * as Core from "../../core.js";
import { APIPromise } from "../../core.js";
import { APIResource } from "../../resource.js";
import * as Shared from "../shared.js";
import * as InputItemsAPI from "./input-items.js";
import { InputItemListParams, InputItems, ResponseItemList } from "./input-items.js";
import * as ResponsesAPI from "./responses.js";
import { ResponseStream, ResponseStreamParams } from "../../lib/responses/ResponseStream.js";
import { CursorPage } from "../../pagination.js";
import { Stream } from "../../streaming.js";
export interface ParsedResponseOutputText<ParsedT> extends ResponseOutputText {
    parsed: ParsedT | null;
}
export type ParsedContent<ParsedT> = ParsedResponseOutputText<ParsedT> | ResponseOutputRefusal;
export interface ParsedResponseOutputMessage<ParsedT> extends ResponseOutputMessage {
    content: ParsedContent<ParsedT>[];
}
export interface ParsedResponseFunctionToolCall extends ResponseFunctionToolCall {
    parsed_arguments: any;
}
export type ParsedResponseOutputItem<ParsedT> = ParsedResponseOutputMessage<ParsedT> | ParsedResponseFunctionToolCall | ResponseFileSearchToolCall | ResponseFunctionWebSearch | ResponseComputerToolCall | ResponseReasoningItem | ResponseOutputItem.ImageGenerationCall | ResponseCodeInterpreterToolCall | ResponseOutputItem.LocalShellCall | ResponseOutputItem.McpCall | ResponseOutputItem.McpListTools | ResponseOutputItem.McpApprovalRequest;
export interface ParsedResponse<ParsedT> extends Response {
    output: Array<ParsedResponseOutputItem<ParsedT>>;
    output_parsed: ParsedT | null;
}
export type ResponseParseParams = ResponseCreateParamsNonStreaming;
export declare class Responses extends APIResource {
    inputItems: InputItemsAPI.InputItems;
    /**
     * Creates a model response. Provide
     * [text](https://platform.openai.com/docs/guides/text) or
     * [image](https://platform.openai.com/docs/guides/images) inputs to generate
     * [text](https://platform.openai.com/docs/guides/text) or
     * [JSON](https://platform.openai.com/docs/guides/structured-outputs) outputs. Have
     * the model call your own
     * [custom code](https://platform.openai.com/docs/guides/function-calling) or use
     * built-in [tools](https://platform.openai.com/docs/guides/tools) like
     * [web search](https://platform.openai.com/docs/guides/tools-web-search) or
     * [file search](https://platform.openai.com/docs/guides/tools-file-search) to use
     * your own data as input for the model's response.
     *
     * @example
     * ```ts
     * const response = await client.responses.create({
     *   input: 'string',
     *   model: 'gpt-4o',
     * });
     * ```
     */
    create(body: ResponseCreateParamsNonStreaming, options?: Core.RequestOptions): APIPromise<Response>;
    create(body: ResponseCreateParamsStreaming, options?: Core.RequestOptions): APIPromise<Stream<ResponseStreamEvent>>;
    create(body: ResponseCreateParamsBase, options?: Core.RequestOptions): APIPromise<Stream<ResponseStreamEvent> | Response>;
    /**
     * Retrieves a model response with the given ID.
     *
     * @example
     * ```ts
     * const response = await client.responses.retrieve(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    retrieve(responseId: string, query?: ResponseRetrieveParamsNonStreaming, options?: Core.RequestOptions): APIPromise<Response>;
    retrieve(responseId: string, query: ResponseRetrieveParamsStreaming, options?: Core.RequestOptions): APIPromise<Stream<ResponseStreamEvent>>;
    retrieve(responseId: string, query?: ResponseRetrieveParamsBase | undefined, options?: Core.RequestOptions): APIPromise<Stream<ResponseStreamEvent> | Response>;
    /**
     * Deletes a model response with the given ID.
     *
     * @example
     * ```ts
     * await client.responses.del(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    del(responseId: string, options?: Core.RequestOptions): Core.APIPromise<void>;
    parse<Params extends ResponseCreateParamsWithTools, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: Core.RequestOptions): Core.APIPromise<ParsedResponse<ParsedT>>;
    /**
     * Creates a model response stream
     */
    stream<Params extends ResponseStreamParams, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: Core.RequestOptions): ResponseStream<ParsedT>;
    /**
     * Cancels a model response with the given ID. Only responses created with the
     * `background` parameter set to `true` can be cancelled.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     *
     * @example
     * ```ts
     * await client.responses.cancel(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    cancel(responseId: string, options?: Core.RequestOptions): Core.APIPromise<void>;
}
export declare class ResponseItemsPage extends CursorPage<ResponseItem> {
}
/**
 * A tool that controls a virtual computer. Learn more about the
 * [computer tool](https://platform.openai.com/docs/guides/tools-computer-use).
 */
export interface ComputerTool {
    /**
     * The height of the computer display.
     */
    display_height: number;
    /**
     * The width of the computer display.
     */
    display_width: number;
    /**
     * The type of computer environment to control.
     */
    environment: 'windows' | 'mac' | 'linux' | 'ubuntu' | 'browser';
    /**
     * The type of the computer use tool. Always `computer_use_preview`.
     */
    type: 'computer-preview';
}
/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role. Messages with the
 * `assistant` role are presumed to have been generated by the model in previous
 * interactions.
 */
export interface EasyInputMessage {
    /**
     * Text, image, or audio input to the model, used to generate a response. Can also
     * contain previous assistant responses.
     */
    content: string | ResponseInputMessageContentList;
    /**
     * The role of the message input. One of `user`, `assistant`, `system`, or
     * `developer`.
     */
    role: 'user' | 'assistant' | 'system' | 'developer';
    /**
     * The type of the message input. Always `message`.
     */
    type?: 'message';
}
/**
 * A tool that searches for relevant content from uploaded files. Learn more about
 * the
 * [file search tool](https://platform.openai.com/docs/guides/tools-file-search).
 */
export interface FileSearchTool {
    /**
     * The type of the file search tool. Always `file_search`.
     */
    type: 'file_search';
    /**
     * The IDs of the vector stores to search.
     */
    vector_store_ids: Array<string>;
    /**
     * A filter to apply.
     */
    filters?: Shared.ComparisonFilter | Shared.CompoundFilter | null;
    /**
     * The maximum number of results to return. This number should be between 1 and 50
     * inclusive.
     */
    max_num_results?: number;
    /**
     * Ranking options for search.
     */
    ranking_options?: FileSearchTool.RankingOptions;
}
export declare namespace FileSearchTool {
    /**
     * Ranking options for search.
     */
    interface RankingOptions {
        /**
         * The ranker to use for the file search.
         */
        ranker?: 'auto' | 'default-2024-11-15';
        /**
         * The score threshold for the file search, a number between 0 and 1. Numbers
         * closer to 1 will attempt to return only the most relevant results, but may
         * return fewer results.
         */
        score_threshold?: number;
    }
}
/**
 * Defines a function in your own code the model can choose to call. Learn more
 * about
 * [function calling](https://platform.openai.com/docs/guides/function-calling).
 */
export interface FunctionTool {
    /**
     * The name of the function to call.
     */
    name: string;
    /**
     * A JSON schema object describing the parameters of the function.
     */
    parameters: Record<string, unknown> | null;
    /**
     * Whether to enforce strict parameter validation. Default `true`.
     */
    strict: boolean | null;
    /**
     * The type of the function tool. Always `function`.
     */
    type: 'function';
    /**
     * A description of the function. Used by the model to determine whether or not to
     * call the function.
     */
    description?: string | null;
}
export interface Response {
    /**
     * Unique identifier for this Response.
     */
    id: string;
    /**
     * Unix timestamp (in seconds) of when this Response was created.
     */
    created_at: number;
    output_text: string;
    /**
     * An error object returned when the model fails to generate a Response.
     */
    error: ResponseError | null;
    /**
     * Details about why the response is incomplete.
     */
    incomplete_details: Response.IncompleteDetails | null;
    /**
     * Inserts a system (or developer) message as the first item in the model's
     * context.
     *
     * When using along with `previous_response_id`, the instructions from a previous
     * response will not be carried over to the next response. This makes it simple to
     * swap out system (or developer) messages in new responses.
     */
    instructions: string | null;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata: Shared.Metadata | null;
    /**
     * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI offers a
     * wide range of models with different capabilities, performance characteristics,
     * and price points. Refer to the
     * [model guide](https://platform.openai.com/docs/models) to browse and compare
     * available models.
     */
    model: Shared.ResponsesModel;
    /**
     * The object type of this resource - always set to `response`.
     */
    object: 'response';
    /**
     * An array of content items generated by the model.
     *
     * - The length and order of items in the `output` array is dependent on the
     *   model's response.
     * - Rather than accessing the first item in the `output` array and assuming it's
     *   an `assistant` message with the content generated by the model, you might
     *   consider using the `output_text` property where supported in SDKs.
     */
    output: Array<ResponseOutputItem>;
    /**
     * Whether to allow the model to run tool calls in parallel.
     */
    parallel_tool_calls: boolean;
    /**
     * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
     * make the output more random, while lower values like 0.2 will make it more
     * focused and deterministic. We generally recommend altering this or `top_p` but
     * not both.
     */
    temperature: number | null;
    /**
     * How the model should select which tool (or tools) to use when generating a
     * response. See the `tools` parameter to see how to specify which tools the model
     * can call.
     */
    tool_choice: ToolChoiceOptions | ToolChoiceTypes | ToolChoiceFunction;
    /**
     * An array of tools the model may call while generating a response. You can
     * specify which tool to use by setting the `tool_choice` parameter.
     *
     * The two categories of tools you can provide the model are:
     *
     * - **Built-in tools**: Tools that are provided by OpenAI that extend the model's
     *   capabilities, like
     *   [web search](https://platform.openai.com/docs/guides/tools-web-search) or
     *   [file search](https://platform.openai.com/docs/guides/tools-file-search).
     *   Learn more about
     *   [built-in tools](https://platform.openai.com/docs/guides/tools).
     * - **Function calls (custom tools)**: Functions that are defined by you, enabling
     *   the model to call your own code. Learn more about
     *   [function calling](https://platform.openai.com/docs/guides/function-calling).
     */
    tools: Array<Tool>;
    /**
     * An alternative to sampling with temperature, called nucleus sampling, where the
     * model considers the results of the tokens with top_p probability mass. So 0.1
     * means only the tokens comprising the top 10% probability mass are considered.
     *
     * We generally recommend altering this or `temperature` but not both.
     */
    top_p: number | null;
    /**
     * Whether to run the model response in the background.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     */
    background?: boolean | null;
    /**
     * An upper bound for the number of tokens that can be generated for a response,
     * including visible output tokens and
     * [reasoning tokens](https://platform.openai.com/docs/guides/reasoning).
     */
    max_output_tokens?: number | null;
    /**
     * The unique ID of the previous response to the model. Use this to create
     * multi-turn conversations. Learn more about
     * [conversation state](https://platform.openai.com/docs/guides/conversation-state).
     */
    previous_response_id?: string | null;
    /**
     * **o-series models only**
     *
     * Configuration options for
     * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
     */
    reasoning?: Shared.Reasoning | null;
    /**
     * Specifies the latency tier to use for processing the request. This parameter is
     * relevant for customers subscribed to the scale tier service:
     *
     * - If set to 'auto', and the Project is Scale tier enabled, the system will
     *   utilize scale tier credits until they are exhausted.
     * - If set to 'auto', and the Project is not Scale tier enabled, the request will
     *   be processed using the default service tier with a lower uptime SLA and no
     *   latency guarentee.
     * - If set to 'default', the request will be processed using the default service
     *   tier with a lower uptime SLA and no latency guarentee.
     * - If set to 'flex', the request will be processed with the Flex Processing
     *   service tier.
     *   [Learn more](https://platform.openai.com/docs/guides/flex-processing).
     * - When not set, the default behavior is 'auto'.
     *
     * When this parameter is set, the response body will include the `service_tier`
     * utilized.
     */
    service_tier?: 'auto' | 'default' | 'flex' | null;
    /**
     * The status of the response generation. One of `completed`, `failed`,
     * `in_progress`, `cancelled`, `queued`, or `incomplete`.
     */
    status?: ResponseStatus;
    /**
     * Configuration options for a text response from the model. Can be plain text or
     * structured JSON data. Learn more:
     *
     * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
     * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
     */
    text?: ResponseTextConfig;
    /**
     * The truncation strategy to use for the model response.
     *
     * - `auto`: If the context of this response and previous ones exceeds the model's
     *   context window size, the model will truncate the response to fit the context
     *   window by dropping input items in the middle of the conversation.
     * - `disabled` (default): If a model response will exceed the context window size
     *   for a model, the request will fail with a 400 error.
     */
    truncation?: 'auto' | 'disabled' | null;
    /**
     * Represents token usage details including input tokens, output tokens, a
     * breakdown of output tokens, and the total tokens used.
     */
    usage?: ResponseUsage;
    /**
     * A stable identifier for your end-users. Used to boost cache hit rates by better
     * bucketing similar requests and to help OpenAI detect and prevent abuse.
     * [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
     */
    user?: string;
}
export declare namespace Response {
    /**
     * Details about why the response is incomplete.
     */
    interface IncompleteDetails {
        /**
         * The reason why the response is incomplete.
         */
        reason?: 'max_output_tokens' | 'content_filter';
    }
}
/**
 * Emitted when there is a partial audio response.
 */
export interface ResponseAudioDeltaEvent {
    /**
     * A chunk of Base64 encoded response audio bytes.
     */
    delta: string;
    /**
     * A sequence number for this chunk of the stream response.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.audio.delta`.
     */
    type: 'response.audio.delta';
}
/**
 * Emitted when the audio response is complete.
 */
export interface ResponseAudioDoneEvent {
    /**
     * The sequence number of the delta.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.audio.done`.
     */
    type: 'response.audio.done';
}
/**
 * Emitted when there is a partial transcript of audio.
 */
export interface ResponseAudioTranscriptDeltaEvent {
    /**
     * The partial transcript of the audio response.
     */
    delta: string;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.audio.transcript.delta`.
     */
    type: 'response.audio.transcript.delta';
}
/**
 * Emitted when the full audio transcript is completed.
 */
export interface ResponseAudioTranscriptDoneEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.audio.transcript.done`.
     */
    type: 'response.audio.transcript.done';
}
/**
 * Emitted when a partial code snippet is added by the code interpreter.
 */
export interface ResponseCodeInterpreterCallCodeDeltaEvent {
    /**
     * The partial code snippet added by the code interpreter.
     */
    delta: string;
    /**
     * The index of the output item that the code interpreter call is in progress.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.code_interpreter_call.code.delta`.
     */
    type: 'response.code_interpreter_call.code.delta';
}
/**
 * Emitted when code snippet output is finalized by the code interpreter.
 */
export interface ResponseCodeInterpreterCallCodeDoneEvent {
    /**
     * The final code snippet output by the code interpreter.
     */
    code: string;
    /**
     * The index of the output item that the code interpreter call is in progress.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.code_interpreter_call.code.done`.
     */
    type: 'response.code_interpreter_call.code.done';
}
/**
 * Emitted when the code interpreter call is completed.
 */
export interface ResponseCodeInterpreterCallCompletedEvent {
    /**
     * A tool call to run code.
     */
    code_interpreter_call: ResponseCodeInterpreterToolCall;
    /**
     * The index of the output item that the code interpreter call is in progress.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.code_interpreter_call.completed`.
     */
    type: 'response.code_interpreter_call.completed';
}
/**
 * Emitted when a code interpreter call is in progress.
 */
export interface ResponseCodeInterpreterCallInProgressEvent {
    /**
     * A tool call to run code.
     */
    code_interpreter_call: ResponseCodeInterpreterToolCall;
    /**
     * The index of the output item that the code interpreter call is in progress.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.code_interpreter_call.in_progress`.
     */
    type: 'response.code_interpreter_call.in_progress';
}
/**
 * Emitted when the code interpreter is actively interpreting the code snippet.
 */
export interface ResponseCodeInterpreterCallInterpretingEvent {
    /**
     * A tool call to run code.
     */
    code_interpreter_call: ResponseCodeInterpreterToolCall;
    /**
     * The index of the output item that the code interpreter call is in progress.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.code_interpreter_call.interpreting`.
     */
    type: 'response.code_interpreter_call.interpreting';
}
/**
 * A tool call to run code.
 */
export interface ResponseCodeInterpreterToolCall {
    /**
     * The unique ID of the code interpreter tool call.
     */
    id: string;
    /**
     * The code to run.
     */
    code: string;
    /**
     * The results of the code interpreter tool call.
     */
    results: Array<ResponseCodeInterpreterToolCall.Logs | ResponseCodeInterpreterToolCall.Files>;
    /**
     * The status of the code interpreter tool call.
     */
    status: 'in_progress' | 'interpreting' | 'completed';
    /**
     * The type of the code interpreter tool call. Always `code_interpreter_call`.
     */
    type: 'code_interpreter_call';
    /**
     * The ID of the container used to run the code.
     */
    container_id?: string;
}
export declare namespace ResponseCodeInterpreterToolCall {
    /**
     * The output of a code interpreter tool call that is text.
     */
    interface Logs {
        /**
         * The logs of the code interpreter tool call.
         */
        logs: string;
        /**
         * The type of the code interpreter text output. Always `logs`.
         */
        type: 'logs';
    }
    /**
     * The output of a code interpreter tool call that is a file.
     */
    interface Files {
        files: Array<Files.File>;
        /**
         * The type of the code interpreter file output. Always `files`.
         */
        type: 'files';
    }
    namespace Files {
        interface File {
            /**
             * The ID of the file.
             */
            file_id: string;
            /**
             * The MIME type of the file.
             */
            mime_type: string;
        }
    }
}
/**
 * Emitted when the model response is complete.
 */
export interface ResponseCompletedEvent {
    /**
     * Properties of the completed response.
     */
    response: Response;
    /**
     * The sequence number for this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.completed`.
     */
    type: 'response.completed';
}
/**
 * A tool call to a computer use tool. See the
 * [computer use guide](https://platform.openai.com/docs/guides/tools-computer-use)
 * for more information.
 */
export interface ResponseComputerToolCall {
    /**
     * The unique ID of the computer call.
     */
    id: string;
    /**
     * A click action.
     */
    action: ResponseComputerToolCall.Click | ResponseComputerToolCall.DoubleClick | ResponseComputerToolCall.Drag | ResponseComputerToolCall.Keypress | ResponseComputerToolCall.Move | ResponseComputerToolCall.Screenshot | ResponseComputerToolCall.Scroll | ResponseComputerToolCall.Type | ResponseComputerToolCall.Wait;
    /**
     * An identifier used when responding to the tool call with output.
     */
    call_id: string;
    /**
     * The pending safety checks for the computer call.
     */
    pending_safety_checks: Array<ResponseComputerToolCall.PendingSafetyCheck>;
    /**
     * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
     * Populated when items are returned via API.
     */
    status: 'in_progress' | 'completed' | 'incomplete';
    /**
     * The type of the computer call. Always `computer_call`.
     */
    type: 'computer_call';
}
export declare namespace ResponseComputerToolCall {
    /**
     * A click action.
     */
    interface Click {
        /**
         * Indicates which mouse button was pressed during the click. One of `left`,
         * `right`, `wheel`, `back`, or `forward`.
         */
        button: 'left' | 'right' | 'wheel' | 'back' | 'forward';
        /**
         * Specifies the event type. For a click action, this property is always set to
         * `click`.
         */
        type: 'click';
        /**
         * The x-coordinate where the click occurred.
         */
        x: number;
        /**
         * The y-coordinate where the click occurred.
         */
        y: number;
    }
    /**
     * A double click action.
     */
    interface DoubleClick {
        /**
         * Specifies the event type. For a double click action, this property is always set
         * to `double_click`.
         */
        type: 'double_click';
        /**
         * The x-coordinate where the double click occurred.
         */
        x: number;
        /**
         * The y-coordinate where the double click occurred.
         */
        y: number;
    }
    /**
     * A drag action.
     */
    interface Drag {
        /**
         * An array of coordinates representing the path of the drag action. Coordinates
         * will appear as an array of objects, eg
         *
         * ```
         * [
         *   { x: 100, y: 200 },
         *   { x: 200, y: 300 }
         * ]
         * ```
         */
        path: Array<Drag.Path>;
        /**
         * Specifies the event type. For a drag action, this property is always set to
         * `drag`.
         */
        type: 'drag';
    }
    namespace Drag {
        /**
         * A series of x/y coordinate pairs in the drag path.
         */
        interface Path {
            /**
             * The x-coordinate.
             */
            x: number;
            /**
             * The y-coordinate.
             */
            y: number;
        }
    }
    /**
     * A collection of keypresses the model would like to perform.
     */
    interface Keypress {
        /**
         * The combination of keys the model is requesting to be pressed. This is an array
         * of strings, each representing a key.
         */
        keys: Array<string>;
        /**
         * Specifies the event type. For a keypress action, this property is always set to
         * `keypress`.
         */
        type: 'keypress';
    }
    /**
     * A mouse move action.
     */
    interface Move {
        /**
         * Specifies the event type. For a move action, this property is always set to
         * `move`.
         */
        type: 'move';
        /**
         * The x-coordinate to move to.
         */
        x: number;
        /**
         * The y-coordinate to move to.
         */
        y: number;
    }
    /**
     * A screenshot action.
     */
    interface Screenshot {
        /**
         * Specifies the event type. For a screenshot action, this property is always set
         * to `screenshot`.
         */
        type: 'screenshot';
    }
    /**
     * A scroll action.
     */
    interface Scroll {
        /**
         * The horizontal scroll distance.
         */
        scroll_x: number;
        /**
         * The vertical scroll distance.
         */
        scroll_y: number;
        /**
         * Specifies the event type. For a scroll action, this property is always set to
         * `scroll`.
         */
        type: 'scroll';
        /**
         * The x-coordinate where the scroll occurred.
         */
        x: number;
        /**
         * The y-coordinate where the scroll occurred.
         */
        y: number;
    }
    /**
     * An action to type in text.
     */
    interface Type {
        /**
         * The text to type.
         */
        text: string;
        /**
         * Specifies the event type. For a type action, this property is always set to
         * `type`.
         */
        type: 'type';
    }
    /**
     * A wait action.
     */
    interface Wait {
        /**
         * Specifies the event type. For a wait action, this property is always set to
         * `wait`.
         */
        type: 'wait';
    }
    /**
     * A pending safety check for the computer call.
     */
    interface PendingSafetyCheck {
        /**
         * The ID of the pending safety check.
         */
        id: string;
        /**
         * The type of the pending safety check.
         */
        code: string;
        /**
         * Details about the pending safety check.
         */
        message: string;
    }
}
export interface ResponseComputerToolCallOutputItem {
    /**
     * The unique ID of the computer call tool output.
     */
    id: string;
    /**
     * The ID of the computer tool call that produced the output.
     */
    call_id: string;
    /**
     * A computer screenshot image used with the computer use tool.
     */
    output: ResponseComputerToolCallOutputScreenshot;
    /**
     * The type of the computer tool call output. Always `computer_call_output`.
     */
    type: 'computer_call_output';
    /**
     * The safety checks reported by the API that have been acknowledged by the
     * developer.
     */
    acknowledged_safety_checks?: Array<ResponseComputerToolCallOutputItem.AcknowledgedSafetyCheck>;
    /**
     * The status of the message input. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when input items are returned via API.
     */
    status?: 'in_progress' | 'completed' | 'incomplete';
}
export declare namespace ResponseComputerToolCallOutputItem {
    /**
     * A pending safety check for the computer call.
     */
    interface AcknowledgedSafetyCheck {
        /**
         * The ID of the pending safety check.
         */
        id: string;
        /**
         * The type of the pending safety check.
         */
        code: string;
        /**
         * Details about the pending safety check.
         */
        message: string;
    }
}
/**
 * A computer screenshot image used with the computer use tool.
 */
export interface ResponseComputerToolCallOutputScreenshot {
    /**
     * Specifies the event type. For a computer screenshot, this property is always set
     * to `computer_screenshot`.
     */
    type: 'computer_screenshot';
    /**
     * The identifier of an uploaded file that contains the screenshot.
     */
    file_id?: string;
    /**
     * The URL of the screenshot image.
     */
    image_url?: string;
}
/**
 * Multi-modal input and output contents.
 */
export type ResponseContent = ResponseInputText | ResponseInputImage | ResponseInputFile | ResponseOutputText | ResponseOutputRefusal;
/**
 * Emitted when a new content part is added.
 */
export interface ResponseContentPartAddedEvent {
    /**
     * The index of the content part that was added.
     */
    content_index: number;
    /**
     * The ID of the output item that the content part was added to.
     */
    item_id: string;
    /**
     * The index of the output item that the content part was added to.
     */
    output_index: number;
    /**
     * The content part that was added.
     */
    part: ResponseOutputText | ResponseOutputRefusal;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.content_part.added`.
     */
    type: 'response.content_part.added';
}
/**
 * Emitted when a content part is done.
 */
export interface ResponseContentPartDoneEvent {
    /**
     * The index of the content part that is done.
     */
    content_index: number;
    /**
     * The ID of the output item that the content part was added to.
     */
    item_id: string;
    /**
     * The index of the output item that the content part was added to.
     */
    output_index: number;
    /**
     * The content part that is done.
     */
    part: ResponseOutputText | ResponseOutputRefusal;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.content_part.done`.
     */
    type: 'response.content_part.done';
}
/**
 * An event that is emitted when a response is created.
 */
export interface ResponseCreatedEvent {
    /**
     * The response that was created.
     */
    response: Response;
    /**
     * The sequence number for this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.created`.
     */
    type: 'response.created';
}
/**
 * An error object returned when the model fails to generate a Response.
 */
export interface ResponseError {
    /**
     * The error code for the response.
     */
    code: 'server_error' | 'rate_limit_exceeded' | 'invalid_prompt' | 'vector_store_timeout' | 'invalid_image' | 'invalid_image_format' | 'invalid_base64_image' | 'invalid_image_url' | 'image_too_large' | 'image_too_small' | 'image_parse_error' | 'image_content_policy_violation' | 'invalid_image_mode' | 'image_file_too_large' | 'unsupported_image_media_type' | 'empty_image_file' | 'failed_to_download_image' | 'image_file_not_found';
    /**
     * A human-readable description of the error.
     */
    message: string;
}
/**
 * Emitted when an error occurs.
 */
export interface ResponseErrorEvent {
    /**
     * The error code.
     */
    code: string | null;
    /**
     * The error message.
     */
    message: string;
    /**
     * The error parameter.
     */
    param: string | null;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `error`.
     */
    type: 'error';
}
/**
 * An event that is emitted when a response fails.
 */
export interface ResponseFailedEvent {
    /**
     * The response that failed.
     */
    response: Response;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.failed`.
     */
    type: 'response.failed';
}
/**
 * Emitted when a file search call is completed (results found).
 */
export interface ResponseFileSearchCallCompletedEvent {
    /**
     * The ID of the output item that the file search call is initiated.
     */
    item_id: string;
    /**
     * The index of the output item that the file search call is initiated.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.file_search_call.completed`.
     */
    type: 'response.file_search_call.completed';
}
/**
 * Emitted when a file search call is initiated.
 */
export interface ResponseFileSearchCallInProgressEvent {
    /**
     * The ID of the output item that the file search call is initiated.
     */
    item_id: string;
    /**
     * The index of the output item that the file search call is initiated.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.file_search_call.in_progress`.
     */
    type: 'response.file_search_call.in_progress';
}
/**
 * Emitted when a file search is currently searching.
 */
export interface ResponseFileSearchCallSearchingEvent {
    /**
     * The ID of the output item that the file search call is initiated.
     */
    item_id: string;
    /**
     * The index of the output item that the file search call is searching.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.file_search_call.searching`.
     */
    type: 'response.file_search_call.searching';
}
/**
 * The results of a file search tool call. See the
 * [file search guide](https://platform.openai.com/docs/guides/tools-file-search)
 * for more information.
 */
export interface ResponseFileSearchToolCall {
    /**
     * The unique ID of the file search tool call.
     */
    id: string;
    /**
     * The queries used to search for files.
     */
    queries: Array<string>;
    /**
     * The status of the file search tool call. One of `in_progress`, `searching`,
     * `incomplete` or `failed`,
     */
    status: 'in_progress' | 'searching' | 'completed' | 'incomplete' | 'failed';
    /**
     * The type of the file search tool call. Always `file_search_call`.
     */
    type: 'file_search_call';
    /**
     * The results of the file search tool call.
     */
    results?: Array<ResponseFileSearchToolCall.Result> | null;
}
export declare namespace ResponseFileSearchToolCall {
    interface Result {
        /**
         * Set of 16 key-value pairs that can be attached to an object. This can be useful
         * for storing additional information about the object in a structured format, and
         * querying for objects via API or the dashboard. Keys are strings with a maximum
         * length of 64 characters. Values are strings with a maximum length of 512
         * characters, booleans, or numbers.
         */
        attributes?: Record<string, string | number | boolean> | null;
        /**
         * The unique ID of the file.
         */
        file_id?: string;
        /**
         * The name of the file.
         */
        filename?: string;
        /**
         * The relevance score of the file - a value between 0 and 1.
         */
        score?: number;
        /**
         * The text that was retrieved from the file.
         */
        text?: string;
    }
}
/**
 * An object specifying the format that the model must output.
 *
 * Configuring `{ "type": "json_schema" }` enables Structured Outputs, which
 * ensures the model will match your supplied JSON schema. Learn more in the
 * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
 *
 * The default format is `{ "type": "text" }` with no additional options.
 *
 * **Not recommended for gpt-4o and newer models:**
 *
 * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
 * ensures the message the model generates is valid JSON. Using `json_schema` is
 * preferred for models that support it.
 */
export type ResponseFormatTextConfig = Shared.ResponseFormatText | ResponseFormatTextJSONSchemaConfig | Shared.ResponseFormatJSONObject;
/**
 * JSON Schema response format. Used to generate structured JSON responses. Learn
 * more about
 * [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).
 */
export interface ResponseFormatTextJSONSchemaConfig {
    /**
     * The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores
     * and dashes, with a maximum length of 64.
     */
    name: string;
    /**
     * The schema for the response format, described as a JSON Schema object. Learn how
     * to build JSON schemas [here](https://json-schema.org/).
     */
    schema: Record<string, unknown>;
    /**
     * The type of response format being defined. Always `json_schema`.
     */
    type: 'json_schema';
    /**
     * A description of what the response format is for, used by the model to determine
     * how to respond in the format.
     */
    description?: string;
    /**
     * Whether to enable strict schema adherence when generating the output. If set to
     * true, the model will always follow the exact schema defined in the `schema`
     * field. Only a subset of JSON Schema is supported when `strict` is `true`. To
     * learn more, read the
     * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
     */
    strict?: boolean | null;
}
/**
 * Emitted when there is a partial function-call arguments delta.
 */
export interface ResponseFunctionCallArgumentsDeltaEvent {
    /**
     * The function-call arguments delta that is added.
     */
    delta: string;
    /**
     * The ID of the output item that the function-call arguments delta is added to.
     */
    item_id: string;
    /**
     * The index of the output item that the function-call arguments delta is added to.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.function_call_arguments.delta`.
     */
    type: 'response.function_call_arguments.delta';
}
/**
 * Emitted when function-call arguments are finalized.
 */
export interface ResponseFunctionCallArgumentsDoneEvent {
    /**
     * The function-call arguments.
     */
    arguments: string;
    /**
     * The ID of the item.
     */
    item_id: string;
    /**
     * The index of the output item.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    type: 'response.function_call_arguments.done';
}
/**
 * A tool call to run a function. See the
 * [function calling guide](https://platform.openai.com/docs/guides/function-calling)
 * for more information.
 */
export interface ResponseFunctionToolCall {
    /**
     * A JSON string of the arguments to pass to the function.
     */
    arguments: string;
    /**
     * The unique ID of the function tool call generated by the model.
     */
    call_id: string;
    /**
     * The name of the function to run.
     */
    name: string;
    /**
     * The type of the function tool call. Always `function_call`.
     */
    type: 'function_call';
    /**
     * The unique ID of the function tool call.
     */
    id?: string;
    /**
     * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
     * Populated when items are returned via API.
     */
    status?: 'in_progress' | 'completed' | 'incomplete';
}
/**
 * A tool call to run a function. See the
 * [function calling guide](https://platform.openai.com/docs/guides/function-calling)
 * for more information.
 */
export interface ResponseFunctionToolCallItem extends ResponseFunctionToolCall {
    /**
     * The unique ID of the function tool call.
     */
    id: string;
}
export interface ResponseFunctionToolCallOutputItem {
    /**
     * The unique ID of the function call tool output.
     */
    id: string;
    /**
     * The unique ID of the function tool call generated by the model.
     */
    call_id: string;
    /**
     * A JSON string of the output of the function tool call.
     */
    output: string;
    /**
     * The type of the function tool call output. Always `function_call_output`.
     */
    type: 'function_call_output';
    /**
     * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
     * Populated when items are returned via API.
     */
    status?: 'in_progress' | 'completed' | 'incomplete';
}
/**
 * The results of a web search tool call. See the
 * [web search guide](https://platform.openai.com/docs/guides/tools-web-search) for
 * more information.
 */
export interface ResponseFunctionWebSearch {
    /**
     * The unique ID of the web search tool call.
     */
    id: string;
    /**
     * The status of the web search tool call.
     */
    status: 'in_progress' | 'searching' | 'completed' | 'failed';
    /**
     * The type of the web search tool call. Always `web_search_call`.
     */
    type: 'web_search_call';
}
/**
 * Emitted when an image generation tool call has completed and the final image is
 * available.
 */
export interface ResponseImageGenCallCompletedEvent {
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.image_generation_call.completed'.
     */
    type: 'response.image_generation_call.completed';
}
/**
 * Emitted when an image generation tool call is actively generating an image
 * (intermediate state).
 */
export interface ResponseImageGenCallGeneratingEvent {
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of the image generation item being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.image_generation_call.generating'.
     */
    type: 'response.image_generation_call.generating';
}
/**
 * Emitted when an image generation tool call is in progress.
 */
export interface ResponseImageGenCallInProgressEvent {
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of the image generation item being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.image_generation_call.in_progress'.
     */
    type: 'response.image_generation_call.in_progress';
}
/**
 * Emitted when a partial image is available during image generation streaming.
 */
export interface ResponseImageGenCallPartialImageEvent {
    /**
     * The unique identifier of the image generation item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * Base64-encoded partial image data, suitable for rendering as an image.
     */
    partial_image_b64: string;
    /**
     * 0-based index for the partial image (backend is 1-based, but this is 0-based for
     * the user).
     */
    partial_image_index: number;
    /**
     * The sequence number of the image generation item being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.image_generation_call.partial_image'.
     */
    type: 'response.image_generation_call.partial_image';
}
/**
 * Emitted when the response is in progress.
 */
export interface ResponseInProgressEvent {
    /**
     * The response that is in progress.
     */
    response: Response;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.in_progress`.
     */
    type: 'response.in_progress';
}
/**
 * Specify additional output data to include in the model response. Currently
 * supported values are:
 *
 * - `file_search_call.results`: Include the search results of the file search tool
 *   call.
 * - `message.input_image.image_url`: Include image urls from the input message.
 * - `computer_call_output.output.image_url`: Include image urls from the computer
 *   call output.
 * - `reasoning.encrypted_content`: Includes an encrypted version of reasoning
 *   tokens in reasoning item outputs. This enables reasoning items to be used in
 *   multi-turn conversations when using the Responses API statelessly (like when
 *   the `store` parameter is set to `false`, or when an organization is enrolled
 *   in the zero data retention program).
 */
export type ResponseIncludable = 'file_search_call.results' | 'message.input_image.image_url' | 'computer_call_output.output.image_url' | 'reasoning.encrypted_content';
/**
 * An event that is emitted when a response finishes as incomplete.
 */
export interface ResponseIncompleteEvent {
    /**
     * The response that was incomplete.
     */
    response: Response;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.incomplete`.
     */
    type: 'response.incomplete';
}
/**
 * A list of one or many input items to the model, containing different content
 * types.
 */
export type ResponseInput = Array<ResponseInputItem>;
/**
 * An audio input to the model.
 */
export interface ResponseInputAudio {
    /**
     * Base64-encoded audio data.
     */
    data: string;
    /**
     * The format of the audio data. Currently supported formats are `mp3` and `wav`.
     */
    format: 'mp3' | 'wav';
    /**
     * The type of the input item. Always `input_audio`.
     */
    type: 'input_audio';
}
/**
 * A text input to the model.
 */
export type ResponseInputContent = ResponseInputText | ResponseInputImage | ResponseInputFile;
/**
 * A file input to the model.
 */
export interface ResponseInputFile {
    /**
     * The type of the input item. Always `input_file`.
     */
    type: 'input_file';
    /**
     * The content of the file to be sent to the model.
     */
    file_data?: string;
    /**
     * The ID of the file to be sent to the model.
     */
    file_id?: string | null;
    /**
     * The name of the file to be sent to the model.
     */
    filename?: string;
}
/**
 * An image input to the model. Learn about
 * [image inputs](https://platform.openai.com/docs/guides/vision).
 */
export interface ResponseInputImage {
    /**
     * The detail level of the image to be sent to the model. One of `high`, `low`, or
     * `auto`. Defaults to `auto`.
     */
    detail: 'low' | 'high' | 'auto';
    /**
     * The type of the input item. Always `input_image`.
     */
    type: 'input_image';
    /**
     * The ID of the file to be sent to the model.
     */
    file_id?: string | null;
    /**
     * The URL of the image to be sent to the model. A fully qualified URL or base64
     * encoded image in a data URL.
     */
    image_url?: string | null;
}
/**
 * A message input to the model with a role indicating instruction following
 * hierarchy. Instructions given with the `developer` or `system` role take
 * precedence over instructions given with the `user` role. Messages with the
 * `assistant` role are presumed to have been generated by the model in previous
 * interactions.
 */
export type ResponseInputItem = EasyInputMessage | ResponseInputItem.Message | ResponseOutputMessage | ResponseFileSearchToolCall | ResponseComputerToolCall | ResponseInputItem.ComputerCallOutput | ResponseFunctionWebSearch | ResponseFunctionToolCall | ResponseInputItem.FunctionCallOutput | ResponseReasoningItem | ResponseInputItem.ImageGenerationCall | ResponseCodeInterpreterToolCall | ResponseInputItem.LocalShellCall | ResponseInputItem.LocalShellCallOutput | ResponseInputItem.McpListTools | ResponseInputItem.McpApprovalRequest | ResponseInputItem.McpApprovalResponse | ResponseInputItem.McpCall | ResponseInputItem.ItemReference;
export declare namespace ResponseInputItem {
    /**
     * A message input to the model with a role indicating instruction following
     * hierarchy. Instructions given with the `developer` or `system` role take
     * precedence over instructions given with the `user` role.
     */
    interface Message {
        /**
         * A list of one or many input items to the model, containing different content
         * types.
         */
        content: ResponsesAPI.ResponseInputMessageContentList;
        /**
         * The role of the message input. One of `user`, `system`, or `developer`.
         */
        role: 'user' | 'system' | 'developer';
        /**
         * The status of item. One of `in_progress`, `completed`, or `incomplete`.
         * Populated when items are returned via API.
         */
        status?: 'in_progress' | 'completed' | 'incomplete';
        /**
         * The type of the message input. Always set to `message`.
         */
        type?: 'message';
    }
    /**
     * The output of a computer tool call.
     */
    interface ComputerCallOutput {
        /**
         * The ID of the computer tool call that produced the output.
         */
        call_id: string;
        /**
         * A computer screenshot image used with the computer use tool.
         */
        output: ResponsesAPI.ResponseComputerToolCallOutputScreenshot;
        /**
         * The type of the computer tool call output. Always `computer_call_output`.
         */
        type: 'computer_call_output';
        /**
         * The ID of the computer tool call output.
         */
        id?: string | null;
        /**
         * The safety checks reported by the API that have been acknowledged by the
         * developer.
         */
        acknowledged_safety_checks?: Array<ComputerCallOutput.AcknowledgedSafetyCheck> | null;
        /**
         * The status of the message input. One of `in_progress`, `completed`, or
         * `incomplete`. Populated when input items are returned via API.
         */
        status?: 'in_progress' | 'completed' | 'incomplete' | null;
    }
    namespace ComputerCallOutput {
        /**
         * A pending safety check for the computer call.
         */
        interface AcknowledgedSafetyCheck {
            /**
             * The ID of the pending safety check.
             */
            id: string;
            /**
             * The type of the pending safety check.
             */
            code?: string | null;
            /**
             * Details about the pending safety check.
             */
            message?: string | null;
        }
    }
    /**
     * The output of a function tool call.
     */
    interface FunctionCallOutput {
        /**
         * The unique ID of the function tool call generated by the model.
         */
        call_id: string;
        /**
         * A JSON string of the output of the function tool call.
         */
        output: string;
        /**
         * The type of the function tool call output. Always `function_call_output`.
         */
        type: 'function_call_output';
        /**
         * The unique ID of the function tool call output. Populated when this item is
         * returned via API.
         */
        id?: string | null;
        /**
         * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
         * Populated when items are returned via API.
         */
        status?: 'in_progress' | 'completed' | 'incomplete' | null;
    }
    /**
     * An image generation request made by the model.
     */
    interface ImageGenerationCall {
        /**
         * The unique ID of the image generation call.
         */
        id: string;
        /**
         * The generated image encoded in base64.
         */
        result: string | null;
        /**
         * The status of the image generation call.
         */
        status: 'in_progress' | 'completed' | 'generating' | 'failed';
        /**
         * The type of the image generation call. Always `image_generation_call`.
         */
        type: 'image_generation_call';
    }
    /**
     * A tool call to run a command on the local shell.
     */
    interface LocalShellCall {
        /**
         * The unique ID of the local shell call.
         */
        id: string;
        /**
         * Execute a shell command on the server.
         */
        action: LocalShellCall.Action;
        /**
         * The unique ID of the local shell tool call generated by the model.
         */
        call_id: string;
        /**
         * The status of the local shell call.
         */
        status: 'in_progress' | 'completed' | 'incomplete';
        /**
         * The type of the local shell call. Always `local_shell_call`.
         */
        type: 'local_shell_call';
    }
    namespace LocalShellCall {
        /**
         * Execute a shell command on the server.
         */
        interface Action {
            /**
             * The command to run.
             */
            command: Array<string>;
            /**
             * Environment variables to set for the command.
             */
            env: Record<string, string>;
            /**
             * The type of the local shell action. Always `exec`.
             */
            type: 'exec';
            /**
             * Optional timeout in milliseconds for the command.
             */
            timeout_ms?: number | null;
            /**
             * Optional user to run the command as.
             */
            user?: string | null;
            /**
             * Optional working directory to run the command in.
             */
            working_directory?: string | null;
        }
    }
    /**
     * The output of a local shell tool call.
     */
    interface LocalShellCallOutput {
        /**
         * The unique ID of the local shell tool call generated by the model.
         */
        id: string;
        /**
         * A JSON string of the output of the local shell tool call.
         */
        output: string;
        /**
         * The type of the local shell tool call output. Always `local_shell_call_output`.
         */
        type: 'local_shell_call_output';
        /**
         * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
         */
        status?: 'in_progress' | 'completed' | 'incomplete' | null;
    }
    /**
     * A list of tools available on an MCP server.
     */
    interface McpListTools {
        /**
         * The unique ID of the list.
         */
        id: string;
        /**
         * The label of the MCP server.
         */
        server_label: string;
        /**
         * The tools available on the server.
         */
        tools: Array<McpListTools.Tool>;
        /**
         * The type of the item. Always `mcp_list_tools`.
         */
        type: 'mcp_list_tools';
        /**
         * Error message if the server could not list tools.
         */
        error?: string | null;
    }
    namespace McpListTools {
        /**
         * A tool available on an MCP server.
         */
        interface Tool {
            /**
             * The JSON schema describing the tool's input.
             */
            input_schema: unknown;
            /**
             * The name of the tool.
             */
            name: string;
            /**
             * Additional annotations about the tool.
             */
            annotations?: unknown | null;
            /**
             * The description of the tool.
             */
            description?: string | null;
        }
    }
    /**
     * A request for human approval of a tool invocation.
     */
    interface McpApprovalRequest {
        /**
         * The unique ID of the approval request.
         */
        id: string;
        /**
         * A JSON string of arguments for the tool.
         */
        arguments: string;
        /**
         * The name of the tool to run.
         */
        name: string;
        /**
         * The label of the MCP server making the request.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_approval_request`.
         */
        type: 'mcp_approval_request';
    }
    /**
     * A response to an MCP approval request.
     */
    interface McpApprovalResponse {
        /**
         * The ID of the approval request being answered.
         */
        approval_request_id: string;
        /**
         * Whether the request was approved.
         */
        approve: boolean;
        /**
         * The type of the item. Always `mcp_approval_response`.
         */
        type: 'mcp_approval_response';
        /**
         * The unique ID of the approval response
         */
        id?: string | null;
        /**
         * Optional reason for the decision.
         */
        reason?: string | null;
    }
    /**
     * An invocation of a tool on an MCP server.
     */
    interface McpCall {
        /**
         * The unique ID of the tool call.
         */
        id: string;
        /**
         * A JSON string of the arguments passed to the tool.
         */
        arguments: string;
        /**
         * The name of the tool that was run.
         */
        name: string;
        /**
         * The label of the MCP server running the tool.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_call`.
         */
        type: 'mcp_call';
        /**
         * The error from the tool call, if any.
         */
        error?: string | null;
        /**
         * The output from the tool call.
         */
        output?: string | null;
    }
    /**
     * An internal identifier for an item to reference.
     */
    interface ItemReference {
        /**
         * The ID of the item to reference.
         */
        id: string;
        /**
         * The type of item to reference. Always `item_reference`.
         */
        type?: 'item_reference' | null;
    }
}
/**
 * A list of one or many input items to the model, containing different content
 * types.
 */
export type ResponseInputMessageContentList = Array<ResponseInputContent>;
export interface ResponseInputMessageItem {
    /**
     * The unique ID of the message input.
     */
    id: string;
    /**
     * A list of one or many input items to the model, containing different content
     * types.
     */
    content: ResponseInputMessageContentList;
    /**
     * The role of the message input. One of `user`, `system`, or `developer`.
     */
    role: 'user' | 'system' | 'developer';
    /**
     * The status of item. One of `in_progress`, `completed`, or `incomplete`.
     * Populated when items are returned via API.
     */
    status?: 'in_progress' | 'completed' | 'incomplete';
    /**
     * The type of the message input. Always set to `message`.
     */
    type?: 'message';
}
/**
 * A text input to the model.
 */
export interface ResponseInputText {
    /**
     * The text input to the model.
     */
    text: string;
    /**
     * The type of the input item. Always `input_text`.
     */
    type: 'input_text';
}
/**
 * Content item used to generate a response.
 */
export type ResponseItem = ResponseInputMessageItem | ResponseOutputMessage | ResponseFileSearchToolCall | ResponseComputerToolCall | ResponseComputerToolCallOutputItem | ResponseFunctionWebSearch | ResponseFunctionToolCallItem | ResponseFunctionToolCallOutputItem | ResponseItem.ImageGenerationCall | ResponseCodeInterpreterToolCall | ResponseItem.LocalShellCall | ResponseItem.LocalShellCallOutput | ResponseItem.McpListTools | ResponseItem.McpApprovalRequest | ResponseItem.McpApprovalResponse | ResponseItem.McpCall;
export declare namespace ResponseItem {
    /**
     * An image generation request made by the model.
     */
    interface ImageGenerationCall {
        /**
         * The unique ID of the image generation call.
         */
        id: string;
        /**
         * The generated image encoded in base64.
         */
        result: string | null;
        /**
         * The status of the image generation call.
         */
        status: 'in_progress' | 'completed' | 'generating' | 'failed';
        /**
         * The type of the image generation call. Always `image_generation_call`.
         */
        type: 'image_generation_call';
    }
    /**
     * A tool call to run a command on the local shell.
     */
    interface LocalShellCall {
        /**
         * The unique ID of the local shell call.
         */
        id: string;
        /**
         * Execute a shell command on the server.
         */
        action: LocalShellCall.Action;
        /**
         * The unique ID of the local shell tool call generated by the model.
         */
        call_id: string;
        /**
         * The status of the local shell call.
         */
        status: 'in_progress' | 'completed' | 'incomplete';
        /**
         * The type of the local shell call. Always `local_shell_call`.
         */
        type: 'local_shell_call';
    }
    namespace LocalShellCall {
        /**
         * Execute a shell command on the server.
         */
        interface Action {
            /**
             * The command to run.
             */
            command: Array<string>;
            /**
             * Environment variables to set for the command.
             */
            env: Record<string, string>;
            /**
             * The type of the local shell action. Always `exec`.
             */
            type: 'exec';
            /**
             * Optional timeout in milliseconds for the command.
             */
            timeout_ms?: number | null;
            /**
             * Optional user to run the command as.
             */
            user?: string | null;
            /**
             * Optional working directory to run the command in.
             */
            working_directory?: string | null;
        }
    }
    /**
     * The output of a local shell tool call.
     */
    interface LocalShellCallOutput {
        /**
         * The unique ID of the local shell tool call generated by the model.
         */
        id: string;
        /**
         * A JSON string of the output of the local shell tool call.
         */
        output: string;
        /**
         * The type of the local shell tool call output. Always `local_shell_call_output`.
         */
        type: 'local_shell_call_output';
        /**
         * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
         */
        status?: 'in_progress' | 'completed' | 'incomplete' | null;
    }
    /**
     * A list of tools available on an MCP server.
     */
    interface McpListTools {
        /**
         * The unique ID of the list.
         */
        id: string;
        /**
         * The label of the MCP server.
         */
        server_label: string;
        /**
         * The tools available on the server.
         */
        tools: Array<McpListTools.Tool>;
        /**
         * The type of the item. Always `mcp_list_tools`.
         */
        type: 'mcp_list_tools';
        /**
         * Error message if the server could not list tools.
         */
        error?: string | null;
    }
    namespace McpListTools {
        /**
         * A tool available on an MCP server.
         */
        interface Tool {
            /**
             * The JSON schema describing the tool's input.
             */
            input_schema: unknown;
            /**
             * The name of the tool.
             */
            name: string;
            /**
             * Additional annotations about the tool.
             */
            annotations?: unknown | null;
            /**
             * The description of the tool.
             */
            description?: string | null;
        }
    }
    /**
     * A request for human approval of a tool invocation.
     */
    interface McpApprovalRequest {
        /**
         * The unique ID of the approval request.
         */
        id: string;
        /**
         * A JSON string of arguments for the tool.
         */
        arguments: string;
        /**
         * The name of the tool to run.
         */
        name: string;
        /**
         * The label of the MCP server making the request.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_approval_request`.
         */
        type: 'mcp_approval_request';
    }
    /**
     * A response to an MCP approval request.
     */
    interface McpApprovalResponse {
        /**
         * The unique ID of the approval response
         */
        id: string;
        /**
         * The ID of the approval request being answered.
         */
        approval_request_id: string;
        /**
         * Whether the request was approved.
         */
        approve: boolean;
        /**
         * The type of the item. Always `mcp_approval_response`.
         */
        type: 'mcp_approval_response';
        /**
         * Optional reason for the decision.
         */
        reason?: string | null;
    }
    /**
     * An invocation of a tool on an MCP server.
     */
    interface McpCall {
        /**
         * The unique ID of the tool call.
         */
        id: string;
        /**
         * A JSON string of the arguments passed to the tool.
         */
        arguments: string;
        /**
         * The name of the tool that was run.
         */
        name: string;
        /**
         * The label of the MCP server running the tool.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_call`.
         */
        type: 'mcp_call';
        /**
         * The error from the tool call, if any.
         */
        error?: string | null;
        /**
         * The output from the tool call.
         */
        output?: string | null;
    }
}
/**
 * Emitted when there is a delta (partial update) to the arguments of an MCP tool
 * call.
 */
export interface ResponseMcpCallArgumentsDeltaEvent {
    /**
     * The partial update to the arguments for the MCP tool call.
     */
    delta: unknown;
    /**
     * The unique identifier of the MCP tool call item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_call.arguments_delta'.
     */
    type: 'response.mcp_call.arguments_delta';
}
/**
 * Emitted when the arguments for an MCP tool call are finalized.
 */
export interface ResponseMcpCallArgumentsDoneEvent {
    /**
     * The finalized arguments for the MCP tool call.
     */
    arguments: unknown;
    /**
     * The unique identifier of the MCP tool call item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_call.arguments_done'.
     */
    type: 'response.mcp_call.arguments_done';
}
/**
 * Emitted when an MCP tool call has completed successfully.
 */
export interface ResponseMcpCallCompletedEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_call.completed'.
     */
    type: 'response.mcp_call.completed';
}
/**
 * Emitted when an MCP tool call has failed.
 */
export interface ResponseMcpCallFailedEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_call.failed'.
     */
    type: 'response.mcp_call.failed';
}
/**
 * Emitted when an MCP tool call is in progress.
 */
export interface ResponseMcpCallInProgressEvent {
    /**
     * The unique identifier of the MCP tool call item being processed.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_call.in_progress'.
     */
    type: 'response.mcp_call.in_progress';
}
/**
 * Emitted when the list of available MCP tools has been successfully retrieved.
 */
export interface ResponseMcpListToolsCompletedEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_list_tools.completed'.
     */
    type: 'response.mcp_list_tools.completed';
}
/**
 * Emitted when the attempt to list available MCP tools has failed.
 */
export interface ResponseMcpListToolsFailedEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_list_tools.failed'.
     */
    type: 'response.mcp_list_tools.failed';
}
/**
 * Emitted when the system is in the process of retrieving the list of available
 * MCP tools.
 */
export interface ResponseMcpListToolsInProgressEvent {
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.mcp_list_tools.in_progress'.
     */
    type: 'response.mcp_list_tools.in_progress';
}
/**
 * An audio output from the model.
 */
export interface ResponseOutputAudio {
    /**
     * Base64-encoded audio data from the model.
     */
    data: string;
    /**
     * The transcript of the audio data from the model.
     */
    transcript: string;
    /**
     * The type of the output audio. Always `output_audio`.
     */
    type: 'output_audio';
}
/**
 * An output message from the model.
 */
export type ResponseOutputItem = ResponseOutputMessage | ResponseFileSearchToolCall | ResponseFunctionToolCall | ResponseFunctionWebSearch | ResponseComputerToolCall | ResponseReasoningItem | ResponseOutputItem.ImageGenerationCall | ResponseCodeInterpreterToolCall | ResponseOutputItem.LocalShellCall | ResponseOutputItem.McpCall | ResponseOutputItem.McpListTools | ResponseOutputItem.McpApprovalRequest;
export declare namespace ResponseOutputItem {
    /**
     * An image generation request made by the model.
     */
    interface ImageGenerationCall {
        /**
         * The unique ID of the image generation call.
         */
        id: string;
        /**
         * The generated image encoded in base64.
         */
        result: string | null;
        /**
         * The status of the image generation call.
         */
        status: 'in_progress' | 'completed' | 'generating' | 'failed';
        /**
         * The type of the image generation call. Always `image_generation_call`.
         */
        type: 'image_generation_call';
    }
    /**
     * A tool call to run a command on the local shell.
     */
    interface LocalShellCall {
        /**
         * The unique ID of the local shell call.
         */
        id: string;
        /**
         * Execute a shell command on the server.
         */
        action: LocalShellCall.Action;
        /**
         * The unique ID of the local shell tool call generated by the model.
         */
        call_id: string;
        /**
         * The status of the local shell call.
         */
        status: 'in_progress' | 'completed' | 'incomplete';
        /**
         * The type of the local shell call. Always `local_shell_call`.
         */
        type: 'local_shell_call';
    }
    namespace LocalShellCall {
        /**
         * Execute a shell command on the server.
         */
        interface Action {
            /**
             * The command to run.
             */
            command: Array<string>;
            /**
             * Environment variables to set for the command.
             */
            env: Record<string, string>;
            /**
             * The type of the local shell action. Always `exec`.
             */
            type: 'exec';
            /**
             * Optional timeout in milliseconds for the command.
             */
            timeout_ms?: number | null;
            /**
             * Optional user to run the command as.
             */
            user?: string | null;
            /**
             * Optional working directory to run the command in.
             */
            working_directory?: string | null;
        }
    }
    /**
     * An invocation of a tool on an MCP server.
     */
    interface McpCall {
        /**
         * The unique ID of the tool call.
         */
        id: string;
        /**
         * A JSON string of the arguments passed to the tool.
         */
        arguments: string;
        /**
         * The name of the tool that was run.
         */
        name: string;
        /**
         * The label of the MCP server running the tool.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_call`.
         */
        type: 'mcp_call';
        /**
         * The error from the tool call, if any.
         */
        error?: string | null;
        /**
         * The output from the tool call.
         */
        output?: string | null;
    }
    /**
     * A list of tools available on an MCP server.
     */
    interface McpListTools {
        /**
         * The unique ID of the list.
         */
        id: string;
        /**
         * The label of the MCP server.
         */
        server_label: string;
        /**
         * The tools available on the server.
         */
        tools: Array<McpListTools.Tool>;
        /**
         * The type of the item. Always `mcp_list_tools`.
         */
        type: 'mcp_list_tools';
        /**
         * Error message if the server could not list tools.
         */
        error?: string | null;
    }
    namespace McpListTools {
        /**
         * A tool available on an MCP server.
         */
        interface Tool {
            /**
             * The JSON schema describing the tool's input.
             */
            input_schema: unknown;
            /**
             * The name of the tool.
             */
            name: string;
            /**
             * Additional annotations about the tool.
             */
            annotations?: unknown | null;
            /**
             * The description of the tool.
             */
            description?: string | null;
        }
    }
    /**
     * A request for human approval of a tool invocation.
     */
    interface McpApprovalRequest {
        /**
         * The unique ID of the approval request.
         */
        id: string;
        /**
         * A JSON string of arguments for the tool.
         */
        arguments: string;
        /**
         * The name of the tool to run.
         */
        name: string;
        /**
         * The label of the MCP server making the request.
         */
        server_label: string;
        /**
         * The type of the item. Always `mcp_approval_request`.
         */
        type: 'mcp_approval_request';
    }
}
/**
 * Emitted when a new output item is added.
 */
export interface ResponseOutputItemAddedEvent {
    /**
     * The output item that was added.
     */
    item: ResponseOutputItem;
    /**
     * The index of the output item that was added.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.output_item.added`.
     */
    type: 'response.output_item.added';
}
/**
 * Emitted when an output item is marked done.
 */
export interface ResponseOutputItemDoneEvent {
    /**
     * The output item that was marked done.
     */
    item: ResponseOutputItem;
    /**
     * The index of the output item that was marked done.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.output_item.done`.
     */
    type: 'response.output_item.done';
}
/**
 * An output message from the model.
 */
export interface ResponseOutputMessage {
    /**
     * The unique ID of the output message.
     */
    id: string;
    /**
     * The content of the output message.
     */
    content: Array<ResponseOutputText | ResponseOutputRefusal>;
    /**
     * The role of the output message. Always `assistant`.
     */
    role: 'assistant';
    /**
     * The status of the message input. One of `in_progress`, `completed`, or
     * `incomplete`. Populated when input items are returned via API.
     */
    status: 'in_progress' | 'completed' | 'incomplete';
    /**
     * The type of the output message. Always `message`.
     */
    type: 'message';
}
/**
 * A refusal from the model.
 */
export interface ResponseOutputRefusal {
    /**
     * The refusal explanationfrom the model.
     */
    refusal: string;
    /**
     * The type of the refusal. Always `refusal`.
     */
    type: 'refusal';
}
/**
 * A text output from the model.
 */
export interface ResponseOutputText {
    /**
     * The annotations of the text output.
     */
    annotations: Array<ResponseOutputText.FileCitation | ResponseOutputText.URLCitation | ResponseOutputText.FilePath>;
    /**
     * The text output from the model.
     */
    text: string;
    /**
     * The type of the output text. Always `output_text`.
     */
    type: 'output_text';
    logprobs?: Array<ResponseOutputText.Logprob>;
}
export declare namespace ResponseOutputText {
    /**
     * A citation to a file.
     */
    interface FileCitation {
        /**
         * The ID of the file.
         */
        file_id: string;
        /**
         * The index of the file in the list of files.
         */
        index: number;
        /**
         * The type of the file citation. Always `file_citation`.
         */
        type: 'file_citation';
    }
    /**
     * A citation for a web resource used to generate a model response.
     */
    interface URLCitation {
        /**
         * The index of the last character of the URL citation in the message.
         */
        end_index: number;
        /**
         * The index of the first character of the URL citation in the message.
         */
        start_index: number;
        /**
         * The title of the web resource.
         */
        title: string;
        /**
         * The type of the URL citation. Always `url_citation`.
         */
        type: 'url_citation';
        /**
         * The URL of the web resource.
         */
        url: string;
    }
    /**
     * A path to a file.
     */
    interface FilePath {
        /**
         * The ID of the file.
         */
        file_id: string;
        /**
         * The index of the file in the list of files.
         */
        index: number;
        /**
         * The type of the file path. Always `file_path`.
         */
        type: 'file_path';
    }
    /**
     * The log probability of a token.
     */
    interface Logprob {
        token: string;
        bytes: Array<number>;
        logprob: number;
        top_logprobs: Array<Logprob.TopLogprob>;
    }
    namespace Logprob {
        /**
         * The top log probability of a token.
         */
        interface TopLogprob {
            token: string;
            bytes: Array<number>;
            logprob: number;
        }
    }
}
/**
 * Emitted when an annotation is added to output text content.
 */
export interface ResponseOutputTextAnnotationAddedEvent {
    /**
     * The annotation object being added. (See annotation schema for details.)
     */
    annotation: unknown;
    /**
     * The index of the annotation within the content part.
     */
    annotation_index: number;
    /**
     * The index of the content part within the output item.
     */
    content_index: number;
    /**
     * The unique identifier of the item to which the annotation is being added.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.output_text_annotation.added'.
     */
    type: 'response.output_text_annotation.added';
}
/**
 * Emitted when a response is queued and waiting to be processed.
 */
export interface ResponseQueuedEvent {
    /**
     * The full response object that is queued.
     */
    response: Response;
    /**
     * The sequence number for this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.queued'.
     */
    type: 'response.queued';
}
/**
 * Emitted when there is a delta (partial update) to the reasoning content.
 */
export interface ResponseReasoningDeltaEvent {
    /**
     * The index of the reasoning content part within the output item.
     */
    content_index: number;
    /**
     * The partial update to the reasoning content.
     */
    delta: unknown;
    /**
     * The unique identifier of the item for which reasoning is being updated.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always 'response.reasoning.delta'.
     */
    type: 'response.reasoning.delta';
}
/**
 * Emitted when the reasoning content is finalized for an item.
 */
export interface ResponseReasoningDoneEvent {
    /**
     * The index of the reasoning content part within the output item.
     */
    content_index: number;
    /**
     * The unique identifier of the item for which reasoning is finalized.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The finalized reasoning text.
     */
    text: string;
    /**
     * The type of the event. Always 'response.reasoning.done'.
     */
    type: 'response.reasoning.done';
}
/**
 * A description of the chain of thought used by a reasoning model while generating
 * a response. Be sure to include these items in your `input` to the Responses API
 * for subsequent turns of a conversation if you are manually
 * [managing context](https://platform.openai.com/docs/guides/conversation-state).
 */
export interface ResponseReasoningItem {
    /**
     * The unique identifier of the reasoning content.
     */
    id: string;
    /**
     * Reasoning text contents.
     */
    summary: Array<ResponseReasoningItem.Summary>;
    /**
     * The type of the object. Always `reasoning`.
     */
    type: 'reasoning';
    /**
     * The encrypted content of the reasoning item - populated when a response is
     * generated with `reasoning.encrypted_content` in the `include` parameter.
     */
    encrypted_content?: string | null;
    /**
     * The status of the item. One of `in_progress`, `completed`, or `incomplete`.
     * Populated when items are returned via API.
     */
    status?: 'in_progress' | 'completed' | 'incomplete';
}
export declare namespace ResponseReasoningItem {
    interface Summary {
        /**
         * A short summary of the reasoning used by the model when generating the response.
         */
        text: string;
        /**
         * The type of the object. Always `summary_text`.
         */
        type: 'summary_text';
    }
}
/**
 * Emitted when there is a delta (partial update) to the reasoning summary content.
 */
export interface ResponseReasoningSummaryDeltaEvent {
    /**
     * The partial update to the reasoning summary content.
     */
    delta: unknown;
    /**
     * The unique identifier of the item for which the reasoning summary is being
     * updated.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the output item.
     */
    summary_index: number;
    /**
     * The type of the event. Always 'response.reasoning_summary.delta'.
     */
    type: 'response.reasoning_summary.delta';
}
/**
 * Emitted when the reasoning summary content is finalized for an item.
 */
export interface ResponseReasoningSummaryDoneEvent {
    /**
     * The unique identifier of the item for which the reasoning summary is finalized.
     */
    item_id: string;
    /**
     * The index of the output item in the response's output array.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the output item.
     */
    summary_index: number;
    /**
     * The finalized reasoning summary text.
     */
    text: string;
    /**
     * The type of the event. Always 'response.reasoning_summary.done'.
     */
    type: 'response.reasoning_summary.done';
}
/**
 * Emitted when a new reasoning summary part is added.
 */
export interface ResponseReasoningSummaryPartAddedEvent {
    /**
     * The ID of the item this summary part is associated with.
     */
    item_id: string;
    /**
     * The index of the output item this summary part is associated with.
     */
    output_index: number;
    /**
     * The summary part that was added.
     */
    part: ResponseReasoningSummaryPartAddedEvent.Part;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the reasoning summary.
     */
    summary_index: number;
    /**
     * The type of the event. Always `response.reasoning_summary_part.added`.
     */
    type: 'response.reasoning_summary_part.added';
}
export declare namespace ResponseReasoningSummaryPartAddedEvent {
    /**
     * The summary part that was added.
     */
    interface Part {
        /**
         * The text of the summary part.
         */
        text: string;
        /**
         * The type of the summary part. Always `summary_text`.
         */
        type: 'summary_text';
    }
}
/**
 * Emitted when a reasoning summary part is completed.
 */
export interface ResponseReasoningSummaryPartDoneEvent {
    /**
     * The ID of the item this summary part is associated with.
     */
    item_id: string;
    /**
     * The index of the output item this summary part is associated with.
     */
    output_index: number;
    /**
     * The completed summary part.
     */
    part: ResponseReasoningSummaryPartDoneEvent.Part;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the reasoning summary.
     */
    summary_index: number;
    /**
     * The type of the event. Always `response.reasoning_summary_part.done`.
     */
    type: 'response.reasoning_summary_part.done';
}
export declare namespace ResponseReasoningSummaryPartDoneEvent {
    /**
     * The completed summary part.
     */
    interface Part {
        /**
         * The text of the summary part.
         */
        text: string;
        /**
         * The type of the summary part. Always `summary_text`.
         */
        type: 'summary_text';
    }
}
/**
 * Emitted when a delta is added to a reasoning summary text.
 */
export interface ResponseReasoningSummaryTextDeltaEvent {
    /**
     * The text delta that was added to the summary.
     */
    delta: string;
    /**
     * The ID of the item this summary text delta is associated with.
     */
    item_id: string;
    /**
     * The index of the output item this summary text delta is associated with.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the reasoning summary.
     */
    summary_index: number;
    /**
     * The type of the event. Always `response.reasoning_summary_text.delta`.
     */
    type: 'response.reasoning_summary_text.delta';
}
/**
 * Emitted when a reasoning summary text is completed.
 */
export interface ResponseReasoningSummaryTextDoneEvent {
    /**
     * The ID of the item this summary text is associated with.
     */
    item_id: string;
    /**
     * The index of the output item this summary text is associated with.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The index of the summary part within the reasoning summary.
     */
    summary_index: number;
    /**
     * The full text of the completed reasoning summary.
     */
    text: string;
    /**
     * The type of the event. Always `response.reasoning_summary_text.done`.
     */
    type: 'response.reasoning_summary_text.done';
}
/**
 * Emitted when there is a partial refusal text.
 */
export interface ResponseRefusalDeltaEvent {
    /**
     * The index of the content part that the refusal text is added to.
     */
    content_index: number;
    /**
     * The refusal text that is added.
     */
    delta: string;
    /**
     * The ID of the output item that the refusal text is added to.
     */
    item_id: string;
    /**
     * The index of the output item that the refusal text is added to.
     */
    output_index: number;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.refusal.delta`.
     */
    type: 'response.refusal.delta';
}
/**
 * Emitted when refusal text is finalized.
 */
export interface ResponseRefusalDoneEvent {
    /**
     * The index of the content part that the refusal text is finalized.
     */
    content_index: number;
    /**
     * The ID of the output item that the refusal text is finalized.
     */
    item_id: string;
    /**
     * The index of the output item that the refusal text is finalized.
     */
    output_index: number;
    /**
     * The refusal text that is finalized.
     */
    refusal: string;
    /**
     * The sequence number of this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.refusal.done`.
     */
    type: 'response.refusal.done';
}
/**
 * The status of the response generation. One of `completed`, `failed`,
 * `in_progress`, `cancelled`, `queued`, or `incomplete`.
 */
export type ResponseStatus = 'completed' | 'failed' | 'in_progress' | 'cancelled' | 'queued' | 'incomplete';
/**
 * Emitted when there is a partial audio response.
 */
export type ResponseStreamEvent = ResponseAudioDeltaEvent | ResponseAudioDoneEvent | ResponseAudioTranscriptDeltaEvent | ResponseAudioTranscriptDoneEvent | ResponseCodeInterpreterCallCodeDeltaEvent | ResponseCodeInterpreterCallCodeDoneEvent | ResponseCodeInterpreterCallCompletedEvent | ResponseCodeInterpreterCallInProgressEvent | ResponseCodeInterpreterCallInterpretingEvent | ResponseCompletedEvent | ResponseContentPartAddedEvent | ResponseContentPartDoneEvent | ResponseCreatedEvent | ResponseErrorEvent | ResponseFileSearchCallCompletedEvent | ResponseFileSearchCallInProgressEvent | ResponseFileSearchCallSearchingEvent | ResponseFunctionCallArgumentsDeltaEvent | ResponseFunctionCallArgumentsDoneEvent | ResponseInProgressEvent | ResponseFailedEvent | ResponseIncompleteEvent | ResponseOutputItemAddedEvent | ResponseOutputItemDoneEvent | ResponseReasoningSummaryPartAddedEvent | ResponseReasoningSummaryPartDoneEvent | ResponseReasoningSummaryTextDeltaEvent | ResponseReasoningSummaryTextDoneEvent | ResponseRefusalDeltaEvent | ResponseRefusalDoneEvent | ResponseTextDeltaEvent | ResponseTextDoneEvent | ResponseWebSearchCallCompletedEvent | ResponseWebSearchCallInProgressEvent | ResponseWebSearchCallSearchingEvent | ResponseImageGenCallCompletedEvent | ResponseImageGenCallGeneratingEvent | ResponseImageGenCallInProgressEvent | ResponseImageGenCallPartialImageEvent | ResponseMcpCallArgumentsDeltaEvent | ResponseMcpCallArgumentsDoneEvent | ResponseMcpCallCompletedEvent | ResponseMcpCallFailedEvent | ResponseMcpCallInProgressEvent | ResponseMcpListToolsCompletedEvent | ResponseMcpListToolsFailedEvent | ResponseMcpListToolsInProgressEvent | ResponseOutputTextAnnotationAddedEvent | ResponseQueuedEvent | ResponseReasoningDeltaEvent | ResponseReasoningDoneEvent | ResponseReasoningSummaryDeltaEvent | ResponseReasoningSummaryDoneEvent;
/**
 * Configuration options for a text response from the model. Can be plain text or
 * structured JSON data. Learn more:
 *
 * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
 * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
 */
export interface ResponseTextConfig {
    /**
     * An object specifying the format that the model must output.
     *
     * Configuring `{ "type": "json_schema" }` enables Structured Outputs, which
     * ensures the model will match your supplied JSON schema. Learn more in the
     * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
     *
     * The default format is `{ "type": "text" }` with no additional options.
     *
     * **Not recommended for gpt-4o and newer models:**
     *
     * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
     * ensures the message the model generates is valid JSON. Using `json_schema` is
     * preferred for models that support it.
     */
    format?: ResponseFormatTextConfig;
}
/**
 * Emitted when there is an additional text delta.
 */
export interface ResponseTextDeltaEvent {
    /**
     * The index of the content part that the text delta was added to.
     */
    content_index: number;
    /**
     * The text delta that was added.
     */
    delta: string;
    /**
     * The ID of the output item that the text delta was added to.
     */
    item_id: string;
    /**
     * The index of the output item that the text delta was added to.
     */
    output_index: number;
    /**
     * The sequence number for this event.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.output_text.delta`.
     */
    type: 'response.output_text.delta';
}
/**
 * Emitted when text content is finalized.
 */
export interface ResponseTextDoneEvent {
    /**
     * The index of the content part that the text content is finalized.
     */
    content_index: number;
    /**
     * The ID of the output item that the text content is finalized.
     */
    item_id: string;
    /**
     * The index of the output item that the text content is finalized.
     */
    output_index: number;
    /**
     * The sequence number for this event.
     */
    sequence_number: number;
    /**
     * The text content that is finalized.
     */
    text: string;
    /**
     * The type of the event. Always `response.output_text.done`.
     */
    type: 'response.output_text.done';
}
/**
 * Represents token usage details including input tokens, output tokens, a
 * breakdown of output tokens, and the total tokens used.
 */
export interface ResponseUsage {
    /**
     * The number of input tokens.
     */
    input_tokens: number;
    /**
     * A detailed breakdown of the input tokens.
     */
    input_tokens_details: ResponseUsage.InputTokensDetails;
    /**
     * The number of output tokens.
     */
    output_tokens: number;
    /**
     * A detailed breakdown of the output tokens.
     */
    output_tokens_details: ResponseUsage.OutputTokensDetails;
    /**
     * The total number of tokens used.
     */
    total_tokens: number;
}
export declare namespace ResponseUsage {
    /**
     * A detailed breakdown of the input tokens.
     */
    interface InputTokensDetails {
        /**
         * The number of tokens that were retrieved from the cache.
         * [More on prompt caching](https://platform.openai.com/docs/guides/prompt-caching).
         */
        cached_tokens: number;
    }
    /**
     * A detailed breakdown of the output tokens.
     */
    interface OutputTokensDetails {
        /**
         * The number of reasoning tokens.
         */
        reasoning_tokens: number;
    }
}
/**
 * Emitted when a web search call is completed.
 */
export interface ResponseWebSearchCallCompletedEvent {
    /**
     * Unique ID for the output item associated with the web search call.
     */
    item_id: string;
    /**
     * The index of the output item that the web search call is associated with.
     */
    output_index: number;
    /**
     * The sequence number of the web search call being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.web_search_call.completed`.
     */
    type: 'response.web_search_call.completed';
}
/**
 * Emitted when a web search call is initiated.
 */
export interface ResponseWebSearchCallInProgressEvent {
    /**
     * Unique ID for the output item associated with the web search call.
     */
    item_id: string;
    /**
     * The index of the output item that the web search call is associated with.
     */
    output_index: number;
    /**
     * The sequence number of the web search call being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.web_search_call.in_progress`.
     */
    type: 'response.web_search_call.in_progress';
}
/**
 * Emitted when a web search call is executing.
 */
export interface ResponseWebSearchCallSearchingEvent {
    /**
     * Unique ID for the output item associated with the web search call.
     */
    item_id: string;
    /**
     * The index of the output item that the web search call is associated with.
     */
    output_index: number;
    /**
     * The sequence number of the web search call being processed.
     */
    sequence_number: number;
    /**
     * The type of the event. Always `response.web_search_call.searching`.
     */
    type: 'response.web_search_call.searching';
}
/**
 * A tool that can be used to generate a response.
 */
export type Tool = FunctionTool | FileSearchTool | WebSearchTool | ComputerTool | Tool.Mcp | Tool.CodeInterpreter | Tool.ImageGeneration | Tool.LocalShell;
export declare namespace Tool {
    /**
     * Give the model access to additional tools via remote Model Context Protocol
     * (MCP) servers.
     * [Learn more about MCP](https://platform.openai.com/docs/guides/tools-remote-mcp).
     */
    interface Mcp {
        /**
         * A label for this MCP server, used to identify it in tool calls.
         */
        server_label: string;
        /**
         * The URL for the MCP server.
         */
        server_url: string;
        /**
         * The type of the MCP tool. Always `mcp`.
         */
        type: 'mcp';
        /**
         * List of allowed tool names or a filter object.
         */
        allowed_tools?: Array<string> | Mcp.McpAllowedToolsFilter | null;
        /**
         * Optional HTTP headers to send to the MCP server. Use for authentication or other
         * purposes.
         */
        headers?: Record<string, string> | null;
        /**
         * Specify which of the MCP server's tools require approval.
         */
        require_approval?: Mcp.McpToolApprovalFilter | 'always' | 'never' | null;
    }
    namespace Mcp {
        /**
         * A filter object to specify which tools are allowed.
         */
        interface McpAllowedToolsFilter {
            /**
             * List of allowed tool names.
             */
            tool_names?: Array<string>;
        }
        interface McpToolApprovalFilter {
            /**
             * A list of tools that always require approval.
             */
            always?: McpToolApprovalFilter.Always;
            /**
             * A list of tools that never require approval.
             */
            never?: McpToolApprovalFilter.Never;
        }
        namespace McpToolApprovalFilter {
            /**
             * A list of tools that always require approval.
             */
            interface Always {
                /**
                 * List of tools that require approval.
                 */
                tool_names?: Array<string>;
            }
            /**
             * A list of tools that never require approval.
             */
            interface Never {
                /**
                 * List of tools that do not require approval.
                 */
                tool_names?: Array<string>;
            }
        }
    }
    /**
     * A tool that runs Python code to help generate a response to a prompt.
     */
    interface CodeInterpreter {
        /**
         * The code interpreter container. Can be a container ID or an object that
         * specifies uploaded file IDs to make available to your code.
         */
        container: string | CodeInterpreter.CodeInterpreterToolAuto;
        /**
         * The type of the code interpreter tool. Always `code_interpreter`.
         */
        type: 'code_interpreter';
    }
    namespace CodeInterpreter {
        /**
         * Configuration for a code interpreter container. Optionally specify the IDs of
         * the files to run the code on.
         */
        interface CodeInterpreterToolAuto {
            /**
             * Always `auto`.
             */
            type: 'auto';
            /**
             * An optional list of uploaded files to make available to your code.
             */
            file_ids?: Array<string>;
        }
    }
    /**
     * A tool that generates images using a model like `gpt-image-1`.
     */
    interface ImageGeneration {
        /**
         * The type of the image generation tool. Always `image_generation`.
         */
        type: 'image_generation';
        /**
         * Background type for the generated image. One of `transparent`, `opaque`, or
         * `auto`. Default: `auto`.
         */
        background?: 'transparent' | 'opaque' | 'auto';
        /**
         * Optional mask for inpainting. Contains `image_url` (string, optional) and
         * `file_id` (string, optional).
         */
        input_image_mask?: ImageGeneration.InputImageMask;
        /**
         * The image generation model to use. Default: `gpt-image-1`.
         */
        model?: 'gpt-image-1';
        /**
         * Moderation level for the generated image. Default: `auto`.
         */
        moderation?: 'auto' | 'low';
        /**
         * Compression level for the output image. Default: 100.
         */
        output_compression?: number;
        /**
         * The output format of the generated image. One of `png`, `webp`, or `jpeg`.
         * Default: `png`.
         */
        output_format?: 'png' | 'webp' | 'jpeg';
        /**
         * Number of partial images to generate in streaming mode, from 0 (default value)
         * to 3.
         */
        partial_images?: number;
        /**
         * The quality of the generated image. One of `low`, `medium`, `high`, or `auto`.
         * Default: `auto`.
         */
        quality?: 'low' | 'medium' | 'high' | 'auto';
        /**
         * The size of the generated image. One of `1024x1024`, `1024x1536`, `1536x1024`,
         * or `auto`. Default: `auto`.
         */
        size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
    }
    namespace ImageGeneration {
        /**
         * Optional mask for inpainting. Contains `image_url` (string, optional) and
         * `file_id` (string, optional).
         */
        interface InputImageMask {
            /**
             * File ID for the mask image.
             */
            file_id?: string;
            /**
             * Base64-encoded mask image.
             */
            image_url?: string;
        }
    }
    /**
     * A tool that allows the model to execute shell commands in a local environment.
     */
    interface LocalShell {
        /**
         * The type of the local shell tool. Always `local_shell`.
         */
        type: 'local_shell';
    }
}
/**
 * Use this option to force the model to call a specific function.
 */
export interface ToolChoiceFunction {
    /**
     * The name of the function to call.
     */
    name: string;
    /**
     * For function calling, the type is always `function`.
     */
    type: 'function';
}
/**
 * Controls which (if any) tool is called by the model.
 *
 * `none` means the model will not call any tool and instead generates a message.
 *
 * `auto` means the model can pick between generating a message or calling one or
 * more tools.
 *
 * `required` means the model must call one or more tools.
 */
export type ToolChoiceOptions = 'none' | 'auto' | 'required';
/**
 * Indicates that the model should use a built-in tool to generate a response.
 * [Learn more about built-in tools](https://platform.openai.com/docs/guides/tools).
 */
export interface ToolChoiceTypes {
    /**
     * The type of hosted tool the model should to use. Learn more about
     * [built-in tools](https://platform.openai.com/docs/guides/tools).
     *
     * Allowed values are:
     *
     * - `file_search`
     * - `web_search_preview`
     * - `computer_use_preview`
     * - `code_interpreter`
     * - `mcp`
     * - `image_generation`
     */
    type: 'file_search' | 'web_search_preview' | 'computer_use_preview' | 'web_search_preview_2025_03_11' | 'image_generation' | 'code_interpreter' | 'mcp';
}
/**
 * This tool searches the web for relevant results to use in a response. Learn more
 * about the
 * [web search tool](https://platform.openai.com/docs/guides/tools-web-search).
 */
export interface WebSearchTool {
    /**
     * The type of the web search tool. One of `web_search_preview` or
     * `web_search_preview_2025_03_11`.
     */
    type: 'web_search_preview' | 'web_search_preview_2025_03_11';
    /**
     * High level guidance for the amount of context window space to use for the
     * search. One of `low`, `medium`, or `high`. `medium` is the default.
     */
    search_context_size?: 'low' | 'medium' | 'high';
    /**
     * The user's location.
     */
    user_location?: WebSearchTool.UserLocation | null;
}
export declare namespace WebSearchTool {
    /**
     * The user's location.
     */
    interface UserLocation {
        /**
         * The type of location approximation. Always `approximate`.
         */
        type: 'approximate';
        /**
         * Free text input for the city of the user, e.g. `San Francisco`.
         */
        city?: string | null;
        /**
         * The two-letter [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1) of
         * the user, e.g. `US`.
         */
        country?: string | null;
        /**
         * Free text input for the region of the user, e.g. `California`.
         */
        region?: string | null;
        /**
         * The [IANA timezone](https://timeapi.io/documentation/iana-timezones) of the
         * user, e.g. `America/Los_Angeles`.
         */
        timezone?: string | null;
    }
}
export type ResponseCreateParams = ResponseCreateParamsNonStreaming | ResponseCreateParamsStreaming;
export interface ResponseCreateParamsBase {
    /**
     * Text, image, or file inputs to the model, used to generate a response.
     *
     * Learn more:
     *
     * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
     * - [Image inputs](https://platform.openai.com/docs/guides/images)
     * - [File inputs](https://platform.openai.com/docs/guides/pdf-files)
     * - [Conversation state](https://platform.openai.com/docs/guides/conversation-state)
     * - [Function calling](https://platform.openai.com/docs/guides/function-calling)
     */
    input: string | ResponseInput;
    /**
     * Model ID used to generate the response, like `gpt-4o` or `o3`. OpenAI offers a
     * wide range of models with different capabilities, performance characteristics,
     * and price points. Refer to the
     * [model guide](https://platform.openai.com/docs/models) to browse and compare
     * available models.
     */
    model: Shared.ResponsesModel;
    /**
     * Whether to run the model response in the background.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     */
    background?: boolean | null;
    /**
     * Specify additional output data to include in the model response. Currently
     * supported values are:
     *
     * - `file_search_call.results`: Include the search results of the file search tool
     *   call.
     * - `message.input_image.image_url`: Include image urls from the input message.
     * - `computer_call_output.output.image_url`: Include image urls from the computer
     *   call output.
     * - `reasoning.encrypted_content`: Includes an encrypted version of reasoning
     *   tokens in reasoning item outputs. This enables reasoning items to be used in
     *   multi-turn conversations when using the Responses API statelessly (like when
     *   the `store` parameter is set to `false`, or when an organization is enrolled
     *   in the zero data retention program).
     */
    include?: Array<ResponseIncludable> | null;
    /**
     * Inserts a system (or developer) message as the first item in the model's
     * context.
     *
     * When using along with `previous_response_id`, the instructions from a previous
     * response will not be carried over to the next response. This makes it simple to
     * swap out system (or developer) messages in new responses.
     */
    instructions?: string | null;
    /**
     * An upper bound for the number of tokens that can be generated for a response,
     * including visible output tokens and
     * [reasoning tokens](https://platform.openai.com/docs/guides/reasoning).
     */
    max_output_tokens?: number | null;
    /**
     * Set of 16 key-value pairs that can be attached to an object. This can be useful
     * for storing additional information about the object in a structured format, and
     * querying for objects via API or the dashboard.
     *
     * Keys are strings with a maximum length of 64 characters. Values are strings with
     * a maximum length of 512 characters.
     */
    metadata?: Shared.Metadata | null;
    /**
     * Whether to allow the model to run tool calls in parallel.
     */
    parallel_tool_calls?: boolean | null;
    /**
     * The unique ID of the previous response to the model. Use this to create
     * multi-turn conversations. Learn more about
     * [conversation state](https://platform.openai.com/docs/guides/conversation-state).
     */
    previous_response_id?: string | null;
    /**
     * **o-series models only**
     *
     * Configuration options for
     * [reasoning models](https://platform.openai.com/docs/guides/reasoning).
     */
    reasoning?: Shared.Reasoning | null;
    /**
     * Specifies the latency tier to use for processing the request. This parameter is
     * relevant for customers subscribed to the scale tier service:
     *
     * - If set to 'auto', and the Project is Scale tier enabled, the system will
     *   utilize scale tier credits until they are exhausted.
     * - If set to 'auto', and the Project is not Scale tier enabled, the request will
     *   be processed using the default service tier with a lower uptime SLA and no
     *   latency guarentee.
     * - If set to 'default', the request will be processed using the default service
     *   tier with a lower uptime SLA and no latency guarentee.
     * - If set to 'flex', the request will be processed with the Flex Processing
     *   service tier.
     *   [Learn more](https://platform.openai.com/docs/guides/flex-processing).
     * - When not set, the default behavior is 'auto'.
     *
     * When this parameter is set, the response body will include the `service_tier`
     * utilized.
     */
    service_tier?: 'auto' | 'default' | 'flex' | null;
    /**
     * Whether to store the generated model response for later retrieval via API.
     */
    store?: boolean | null;
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream?: boolean | null;
    /**
     * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
     * make the output more random, while lower values like 0.2 will make it more
     * focused and deterministic. We generally recommend altering this or `top_p` but
     * not both.
     */
    temperature?: number | null;
    /**
     * Configuration options for a text response from the model. Can be plain text or
     * structured JSON data. Learn more:
     *
     * - [Text inputs and outputs](https://platform.openai.com/docs/guides/text)
     * - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
     */
    text?: ResponseTextConfig;
    /**
     * How the model should select which tool (or tools) to use when generating a
     * response. See the `tools` parameter to see how to specify which tools the model
     * can call.
     */
    tool_choice?: ToolChoiceOptions | ToolChoiceTypes | ToolChoiceFunction;
    /**
     * An array of tools the model may call while generating a response. You can
     * specify which tool to use by setting the `tool_choice` parameter.
     *
     * The two categories of tools you can provide the model are:
     *
     * - **Built-in tools**: Tools that are provided by OpenAI that extend the model's
     *   capabilities, like
     *   [web search](https://platform.openai.com/docs/guides/tools-web-search) or
     *   [file search](https://platform.openai.com/docs/guides/tools-file-search).
     *   Learn more about
     *   [built-in tools](https://platform.openai.com/docs/guides/tools).
     * - **Function calls (custom tools)**: Functions that are defined by you, enabling
     *   the model to call your own code. Learn more about
     *   [function calling](https://platform.openai.com/docs/guides/function-calling).
     */
    tools?: Array<Tool>;
    /**
     * An alternative to sampling with temperature, called nucleus sampling, where the
     * model considers the results of the tokens with top_p probability mass. So 0.1
     * means only the tokens comprising the top 10% probability mass are considered.
     *
     * We generally recommend altering this or `temperature` but not both.
     */
    top_p?: number | null;
    /**
     * The truncation strategy to use for the model response.
     *
     * - `auto`: If the context of this response and previous ones exceeds the model's
     *   context window size, the model will truncate the response to fit the context
     *   window by dropping input items in the middle of the conversation.
     * - `disabled` (default): If a model response will exceed the context window size
     *   for a model, the request will fail with a 400 error.
     */
    truncation?: 'auto' | 'disabled' | null;
    /**
     * A stable identifier for your end-users. Used to boost cache hit rates by better
     * bucketing similar requests and to help OpenAI detect and prevent abuse.
     * [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
     */
    user?: string;
}
export declare namespace ResponseCreateParams {
    type ResponseCreateParamsNonStreaming = ResponsesAPI.ResponseCreateParamsNonStreaming;
    type ResponseCreateParamsStreaming = ResponsesAPI.ResponseCreateParamsStreaming;
}
export interface ResponseCreateParamsNonStreaming extends ResponseCreateParamsBase {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream?: false | null;
}
export interface ResponseCreateParamsStreaming extends ResponseCreateParamsBase {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream: true;
}
export type ResponseRetrieveParams = ResponseRetrieveParamsNonStreaming | ResponseRetrieveParamsStreaming;
export interface ResponseRetrieveParamsBase {
    /**
     * Additional fields to include in the response. See the `include` parameter for
     * Response creation above for more information.
     */
    include?: Array<ResponseIncludable>;
    /**
     * The sequence number of the event after which to start streaming.
     */
    starting_after?: number;
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream?: boolean;
}
export declare namespace ResponseRetrieveParams {
    type ResponseRetrieveParamsNonStreaming = ResponsesAPI.ResponseRetrieveParamsNonStreaming;
    type ResponseRetrieveParamsStreaming = ResponsesAPI.ResponseRetrieveParamsStreaming;
}
export interface ResponseRetrieveParamsNonStreaming extends ResponseRetrieveParamsBase {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream?: false;
}
export interface ResponseRetrieveParamsStreaming extends ResponseRetrieveParamsBase {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section below](https://platform.openai.com/docs/api-reference/responses-streaming)
     * for more information.
     */
    stream: true;
}
export declare namespace Responses {
    export { type ComputerTool as ComputerTool, type EasyInputMessage as EasyInputMessage, type FileSearchTool as FileSearchTool, type FunctionTool as FunctionTool, type Response as Response, type ResponseAudioDeltaEvent as ResponseAudioDeltaEvent, type ResponseAudioDoneEvent as ResponseAudioDoneEvent, type ResponseAudioTranscriptDeltaEvent as ResponseAudioTranscriptDeltaEvent, type ResponseAudioTranscriptDoneEvent as ResponseAudioTranscriptDoneEvent, type ResponseCodeInterpreterCallCodeDeltaEvent as ResponseCodeInterpreterCallCodeDeltaEvent, type ResponseCodeInterpreterCallCodeDoneEvent as ResponseCodeInterpreterCallCodeDoneEvent, type ResponseCodeInterpreterCallCompletedEvent as ResponseCodeInterpreterCallCompletedEvent, type ResponseCodeInterpreterCallInProgressEvent as ResponseCodeInterpreterCallInProgressEvent, type ResponseCodeInterpreterCallInterpretingEvent as ResponseCodeInterpreterCallInterpretingEvent, type ResponseCodeInterpreterToolCall as ResponseCodeInterpreterToolCall, type ResponseCompletedEvent as ResponseCompletedEvent, type ResponseComputerToolCall as ResponseComputerToolCall, type ResponseComputerToolCallOutputItem as ResponseComputerToolCallOutputItem, type ResponseComputerToolCallOutputScreenshot as ResponseComputerToolCallOutputScreenshot, type ResponseContent as ResponseContent, type ResponseContentPartAddedEvent as ResponseContentPartAddedEvent, type ResponseContentPartDoneEvent as ResponseContentPartDoneEvent, type ResponseCreatedEvent as ResponseCreatedEvent, type ResponseError as ResponseError, type ResponseErrorEvent as ResponseErrorEvent, type ResponseFailedEvent as ResponseFailedEvent, type ResponseFileSearchCallCompletedEvent as ResponseFileSearchCallCompletedEvent, type ResponseFileSearchCallInProgressEvent as ResponseFileSearchCallInProgressEvent, type ResponseFileSearchCallSearchingEvent as ResponseFileSearchCallSearchingEvent, type ResponseFileSearchToolCall as ResponseFileSearchToolCall, type ResponseFormatTextConfig as ResponseFormatTextConfig, type ResponseFormatTextJSONSchemaConfig as ResponseFormatTextJSONSchemaConfig, type ResponseFunctionCallArgumentsDeltaEvent as ResponseFunctionCallArgumentsDeltaEvent, type ResponseFunctionCallArgumentsDoneEvent as ResponseFunctionCallArgumentsDoneEvent, type ResponseFunctionToolCall as ResponseFunctionToolCall, type ResponseFunctionToolCallItem as ResponseFunctionToolCallItem, type ResponseFunctionToolCallOutputItem as ResponseFunctionToolCallOutputItem, type ResponseFunctionWebSearch as ResponseFunctionWebSearch, type ResponseImageGenCallCompletedEvent as ResponseImageGenCallCompletedEvent, type ResponseImageGenCallGeneratingEvent as ResponseImageGenCallGeneratingEvent, type ResponseImageGenCallInProgressEvent as ResponseImageGenCallInProgressEvent, type ResponseImageGenCallPartialImageEvent as ResponseImageGenCallPartialImageEvent, type ResponseInProgressEvent as ResponseInProgressEvent, type ResponseIncludable as ResponseIncludable, type ResponseIncompleteEvent as ResponseIncompleteEvent, type ResponseInput as ResponseInput, type ResponseInputAudio as ResponseInputAudio, type ResponseInputContent as ResponseInputContent, type ResponseInputFile as ResponseInputFile, type ResponseInputImage as ResponseInputImage, type ResponseInputItem as ResponseInputItem, type ResponseInputMessageContentList as ResponseInputMessageContentList, type ResponseInputMessageItem as ResponseInputMessageItem, type ResponseInputText as ResponseInputText, type ResponseItem as ResponseItem, type ResponseMcpCallArgumentsDeltaEvent as ResponseMcpCallArgumentsDeltaEvent, type ResponseMcpCallArgumentsDoneEvent as ResponseMcpCallArgumentsDoneEvent, type ResponseMcpCallCompletedEvent as ResponseMcpCallCompletedEvent, type ResponseMcpCallFailedEvent as ResponseMcpCallFailedEvent, type ResponseMcpCallInProgressEvent as ResponseMcpCallInProgressEvent, type ResponseMcpListToolsCompletedEvent as ResponseMcpListToolsCompletedEvent, type ResponseMcpListToolsFailedEvent as ResponseMcpListToolsFailedEvent, type ResponseMcpListToolsInProgressEvent as ResponseMcpListToolsInProgressEvent, type ResponseOutputAudio as ResponseOutputAudio, type ResponseOutputItem as ResponseOutputItem, type ResponseOutputItemAddedEvent as ResponseOutputItemAddedEvent, type ResponseOutputItemDoneEvent as ResponseOutputItemDoneEvent, type ResponseOutputMessage as ResponseOutputMessage, type ResponseOutputRefusal as ResponseOutputRefusal, type ResponseOutputText as ResponseOutputText, type ResponseOutputTextAnnotationAddedEvent as ResponseOutputTextAnnotationAddedEvent, type ResponseQueuedEvent as ResponseQueuedEvent, type ResponseReasoningDeltaEvent as ResponseReasoningDeltaEvent, type ResponseReasoningDoneEvent as ResponseReasoningDoneEvent, type ResponseReasoningItem as ResponseReasoningItem, type ResponseReasoningSummaryDeltaEvent as ResponseReasoningSummaryDeltaEvent, type ResponseReasoningSummaryDoneEvent as ResponseReasoningSummaryDoneEvent, type ResponseReasoningSummaryPartAddedEvent as ResponseReasoningSummaryPartAddedEvent, type ResponseReasoningSummaryPartDoneEvent as ResponseReasoningSummaryPartDoneEvent, type ResponseReasoningSummaryTextDeltaEvent as ResponseReasoningSummaryTextDeltaEvent, type ResponseReasoningSummaryTextDoneEvent as ResponseReasoningSummaryTextDoneEvent, type ResponseRefusalDeltaEvent as ResponseRefusalDeltaEvent, type ResponseRefusalDoneEvent as ResponseRefusalDoneEvent, type ResponseStatus as ResponseStatus, type ResponseStreamEvent as ResponseStreamEvent, type ResponseTextConfig as ResponseTextConfig, type ResponseTextDeltaEvent as ResponseTextDeltaEvent, type ResponseTextDoneEvent as ResponseTextDoneEvent, type ResponseUsage as ResponseUsage, type ResponseWebSearchCallCompletedEvent as ResponseWebSearchCallCompletedEvent, type ResponseWebSearchCallInProgressEvent as ResponseWebSearchCallInProgressEvent, type ResponseWebSearchCallSearchingEvent as ResponseWebSearchCallSearchingEvent, type Tool as Tool, type ToolChoiceFunction as ToolChoiceFunction, type ToolChoiceOptions as ToolChoiceOptions, type ToolChoiceTypes as ToolChoiceTypes, type WebSearchTool as WebSearchTool, type ResponseCreateParams as ResponseCreateParams, type ResponseCreateParamsNonStreaming as ResponseCreateParamsNonStreaming, type ResponseCreateParamsStreaming as ResponseCreateParamsStreaming, type ResponseRetrieveParams as ResponseRetrieveParams, type ResponseRetrieveParamsNonStreaming as ResponseRetrieveParamsNonStreaming, type ResponseRetrieveParamsStreaming as ResponseRetrieveParamsStreaming, };
    export { InputItems as InputItems, type ResponseItemList as ResponseItemList, type InputItemListParams as InputItemListParams, };
}
//# sourceMappingURL=responses.d.ts.map