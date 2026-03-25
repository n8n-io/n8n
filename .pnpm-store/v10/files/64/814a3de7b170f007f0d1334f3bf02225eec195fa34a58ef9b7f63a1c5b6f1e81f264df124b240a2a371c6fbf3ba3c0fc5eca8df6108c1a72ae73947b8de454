import { EventStream } from "../lib/event-streams.js";
import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
export declare class Agents extends ClientSDK {
    /**
     * Agents Completion
     */
    complete(request: components.AgentsCompletionRequest, options?: RequestOptions): Promise<components.ChatCompletionResponse>;
    /**
     * Stream Agents completion
     *
     * @remarks
     * Mistral AI provides the ability to stream responses back to a client in order to allow partial results for certain requests. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a data: [DONE] message. Otherwise, the server will hold the request open until the timeout or until completion, with the response containing the full result as JSON.
     */
    stream(request: components.AgentsCompletionStreamRequest, options?: RequestOptions): Promise<EventStream<components.CompletionEvent>>;
}
//# sourceMappingURL=agents.d.ts.map