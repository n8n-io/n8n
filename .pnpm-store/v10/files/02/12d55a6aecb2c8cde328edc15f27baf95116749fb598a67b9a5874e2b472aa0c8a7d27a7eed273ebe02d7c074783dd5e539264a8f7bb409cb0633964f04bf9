import { ChatCompletion, ChatCompletionCreateParams, ChatCompletionMessageToolCall, ChatCompletionTool } from "../resources/chat/completions.js";
import { ChatCompletionStreamingToolRunnerParams, ChatCompletionStreamParams, ChatCompletionToolRunnerParams, ParsedChatCompletion } from "../resources/beta/chat/completions.js";
import { ResponseFormatJSONSchema } from "../resources/shared.js";
import { type ResponseFormatTextJSONSchemaConfig } from "../resources/responses/responses.js";
type AnyChatCompletionCreateParams = ChatCompletionCreateParams | ChatCompletionToolRunnerParams<any> | ChatCompletionStreamingToolRunnerParams<any> | ChatCompletionStreamParams;
export type ExtractParsedContentFromParams<Params extends AnyChatCompletionCreateParams> = Params['response_format'] extends AutoParseableResponseFormat<infer P> ? P : null;
export type AutoParseableResponseFormat<ParsedT> = ResponseFormatJSONSchema & {
    __output: ParsedT;
    $brand: 'auto-parseable-response-format';
    $parseRaw(content: string): ParsedT;
};
export declare function makeParseableResponseFormat<ParsedT>(response_format: ResponseFormatJSONSchema, parser: (content: string) => ParsedT): AutoParseableResponseFormat<ParsedT>;
export type AutoParseableTextFormat<ParsedT> = ResponseFormatTextJSONSchemaConfig & {
    __output: ParsedT;
    $brand: 'auto-parseable-response-format';
    $parseRaw(content: string): ParsedT;
};
export declare function makeParseableTextFormat<ParsedT>(response_format: ResponseFormatTextJSONSchemaConfig, parser: (content: string) => ParsedT): AutoParseableTextFormat<ParsedT>;
export declare function isAutoParsableResponseFormat<ParsedT>(response_format: any): response_format is AutoParseableResponseFormat<ParsedT>;
type ToolOptions = {
    name: string;
    arguments: any;
    function?: ((args: any) => any) | undefined;
};
export type AutoParseableTool<OptionsT extends ToolOptions, HasFunction = OptionsT['function'] extends Function ? true : false> = ChatCompletionTool & {
    __arguments: OptionsT['arguments'];
    __name: OptionsT['name'];
    __hasFunction: HasFunction;
    $brand: 'auto-parseable-tool';
    $callback: ((args: OptionsT['arguments']) => any) | undefined;
    $parseRaw(args: string): OptionsT['arguments'];
};
export declare function makeParseableTool<OptionsT extends ToolOptions>(tool: ChatCompletionTool, { parser, callback, }: {
    parser: (content: string) => OptionsT['arguments'];
    callback: ((args: any) => any) | undefined;
}): AutoParseableTool<OptionsT['arguments']>;
export declare function isAutoParsableTool(tool: any): tool is AutoParseableTool<any>;
export declare function maybeParseChatCompletion<Params extends ChatCompletionCreateParams | null, ParsedT = Params extends null ? null : ExtractParsedContentFromParams<NonNullable<Params>>>(completion: ChatCompletion, params: Params): ParsedChatCompletion<ParsedT>;
export declare function parseChatCompletion<Params extends ChatCompletionCreateParams, ParsedT = ExtractParsedContentFromParams<Params>>(completion: ChatCompletion, params: Params): ParsedChatCompletion<ParsedT>;
export declare function shouldParseToolCall(params: ChatCompletionCreateParams | null | undefined, toolCall: ChatCompletionMessageToolCall): boolean;
export declare function hasAutoParseableInput(params: AnyChatCompletionCreateParams): boolean;
export declare function validateInputTools(tools: ChatCompletionTool[] | undefined): void;
export {};
//# sourceMappingURL=parser.d.ts.map