import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
import { Fields } from "./fields.js";
export declare class ChatCompletionEvents extends ClientSDK {
    private _fields?;
    get fields(): Fields;
    /**
     * Get Chat Completion Events
     */
    search(request: operations.GetChatCompletionEventsV1ObservabilityChatCompletionEventsSearchPostRequest, options?: RequestOptions): Promise<components.ChatCompletionEvents>;
    /**
     * Alternative to /search that returns only the IDs and that can return many IDs at once
     */
    searchIds(request: components.GetChatCompletionEventIdsInSchema, options?: RequestOptions): Promise<components.ChatCompletionEventIds>;
    /**
     * Get Chat Completion Event
     */
    fetch(request: operations.GetChatCompletionEventV1ObservabilityChatCompletionEventsEventIdGetRequest, options?: RequestOptions): Promise<components.ChatCompletionEvent>;
    /**
     * Get Similar Chat Completion Events
     */
    fetchSimilarEvents(request: operations.GetSimilarChatCompletionEventsV1ObservabilityChatCompletionEventsEventIdSimilarEventsGetRequest, options?: RequestOptions): Promise<components.ChatCompletionEvents>;
    /**
     * Run Judge on an event based on the given options
     */
    judge(request: operations.JudgeChatCompletionEventV1ObservabilityChatCompletionEventsEventIdLiveJudgingPostRequest, options?: RequestOptions): Promise<components.JudgeOutput>;
}
//# sourceMappingURL=chatcompletionevents.d.ts.map