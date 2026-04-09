import * as Core from "../../../core.js";
import { APIResource } from "../../../resource.js";
import { ChatCompletionRunner, ChatCompletionFunctionRunnerParams } from "../../../lib/ChatCompletionRunner.js";
import { ChatCompletionStreamingRunner, ChatCompletionStreamingFunctionRunnerParams } from "../../../lib/ChatCompletionStreamingRunner.js";
import { BaseFunctionsArgs } from "../../../lib/RunnableFunction.js";
import { RunnerOptions } from "../../../lib/AbstractChatCompletionRunner.js";
import { ChatCompletionToolRunnerParams } from "../../../lib/ChatCompletionRunner.js";
import { ChatCompletionStreamingToolRunnerParams } from "../../../lib/ChatCompletionStreamingRunner.js";
import { ChatCompletionStream, type ChatCompletionStreamParams } from "../../../lib/ChatCompletionStream.js";
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessage, ChatCompletionMessageToolCall } from "../../chat/completions.js";
import { ExtractParsedContentFromParams } from "../../../lib/parser.js";
export { ChatCompletionStreamingRunner, type ChatCompletionStreamingFunctionRunnerParams, } from "../../../lib/ChatCompletionStreamingRunner.js";
export { type RunnableFunction, type RunnableFunctions, type RunnableFunctionWithParse, type RunnableFunctionWithoutParse, ParsingFunction, ParsingToolFunction, } from "../../../lib/RunnableFunction.js";
export { type ChatCompletionToolRunnerParams } from "../../../lib/ChatCompletionRunner.js";
export { type ChatCompletionStreamingToolRunnerParams } from "../../../lib/ChatCompletionStreamingRunner.js";
export { ChatCompletionStream, type ChatCompletionStreamParams } from "../../../lib/ChatCompletionStream.js";
export { ChatCompletionRunner, type ChatCompletionFunctionRunnerParams, } from "../../../lib/ChatCompletionRunner.js";
export interface ParsedFunction extends ChatCompletionMessageToolCall.Function {
    parsed_arguments?: unknown;
}
export interface ParsedFunctionToolCall extends ChatCompletionMessageToolCall {
    function: ParsedFunction;
}
export interface ParsedChatCompletionMessage<ParsedT> extends ChatCompletionMessage {
    parsed: ParsedT | null;
    tool_calls: Array<ParsedFunctionToolCall>;
}
export interface ParsedChoice<ParsedT> extends ChatCompletion.Choice {
    message: ParsedChatCompletionMessage<ParsedT>;
}
export interface ParsedChatCompletion<ParsedT> extends ChatCompletion {
    choices: Array<ParsedChoice<ParsedT>>;
}
export type ChatCompletionParseParams = ChatCompletionCreateParamsNonStreaming;
export declare class Completions extends APIResource {
    parse<Params extends ChatCompletionParseParams, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: Core.RequestOptions): Core.APIPromise<ParsedChatCompletion<ParsedT>>;
    /**
     * @deprecated - use `runTools` instead.
     */
    runFunctions<FunctionsArgs extends BaseFunctionsArgs>(body: ChatCompletionFunctionRunnerParams<FunctionsArgs>, options?: Core.RequestOptions): ChatCompletionRunner<null>;
    runFunctions<FunctionsArgs extends BaseFunctionsArgs>(body: ChatCompletionStreamingFunctionRunnerParams<FunctionsArgs>, options?: Core.RequestOptions): ChatCompletionStreamingRunner<null>;
    /**
     * A convenience helper for using tool calls with the /chat/completions endpoint
     * which automatically calls the JavaScript functions you provide and sends their
     * results back to the /chat/completions endpoint, looping as long as the model
     * requests function calls.
     *
     * For more details and examples, see
     * [the docs](https://github.com/openai/openai-node#automated-function-calls)
     */
    runTools<Params extends ChatCompletionToolRunnerParams<any>, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: RunnerOptions): ChatCompletionRunner<ParsedT>;
    runTools<Params extends ChatCompletionStreamingToolRunnerParams<any>, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: RunnerOptions): ChatCompletionStreamingRunner<ParsedT>;
    /**
     * Creates a chat completion stream
     */
    stream<Params extends ChatCompletionStreamParams, ParsedT = ExtractParsedContentFromParams<Params>>(body: Params, options?: Core.RequestOptions): ChatCompletionStream<ParsedT>;
}
//# sourceMappingURL=completions.d.ts.map