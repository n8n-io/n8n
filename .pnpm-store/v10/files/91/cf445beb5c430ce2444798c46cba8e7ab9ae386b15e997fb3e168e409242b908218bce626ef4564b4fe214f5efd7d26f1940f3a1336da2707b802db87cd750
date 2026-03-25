import { EventStream } from "../lib/event-streams.js";
import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import { z } from "zod";
import { ParsedChatCompletionRequest, ParsedChatCompletionResponse } from "../extra/structChat.js";
export declare class Chat extends ClientSDK {
    /**
     * Chat Completion with the response parsed in the same format as the input requestFormat.
     *
     * @remarks
     * The response will be parsed back to the initial Zod object passed in the requestFormat field.
     */
    parse(request: ParsedChatCompletionRequest<z.ZodTypeAny>, options?: RequestOptions): Promise<ParsedChatCompletionResponse<z.ZodTypeAny>>;
    /**
     * Stream chat completion with a parsed request input.
     *
     * @remarks
     * Unlike the .parse method, this method will return a stream of events containing the JSON response. It will not be parsed back to the initial Zod object.
     * If you need to parse the stream, see the examples/src/async_structured_outputs.ts file.
     */
    parseStream(request: ParsedChatCompletionRequest<z.ZodTypeAny>, options?: RequestOptions): Promise<EventStream<components.CompletionEvent>>;
    /**
     * Chat Completion
     */
    complete(request: components.ChatCompletionRequest, options?: RequestOptions): Promise<components.ChatCompletionResponse>;
    /**
     * Stream chat completion
     *
     * @remarks
     * Mistral AI provides the ability to stream responses back to a client in order to allow partial results for certain requests. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a data: [DONE] message. Otherwise, the server will hold the request open until the timeout or until completion, with the response containing the full result as JSON.
     */
    stream(request: components.ChatCompletionStreamRequest, options?: RequestOptions): Promise<EventStream<components.CompletionEvent>>;
}
//# sourceMappingURL=chat.d.ts.map