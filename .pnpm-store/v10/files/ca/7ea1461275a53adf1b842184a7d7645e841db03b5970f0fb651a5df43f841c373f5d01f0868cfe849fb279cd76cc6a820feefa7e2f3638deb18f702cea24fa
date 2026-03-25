export type SDKAssistantMessage = {
    type: "assistant";
    message: {
        id: string;
        role?: string;
        content: Record<string, any>[];
        usage?: Record<string, any>;
        model?: string;
    };
    parent_tool_use_id: string | null;
};
export type SDKSystemMessage = {
    type: "system";
};
export type SDKUserMessage = {
    type: "user";
    message: {
        role?: string;
        content: Record<string, any> | Record<string, any>[] | string;
        usage?: Record<string, any>;
        model?: string;
    };
    session_id: string;
    tool_use_result?: unknown;
    parent_tool_use_id: string | null;
};
export type SDKResultMessage = {
    type: "result";
    modelUsage: ModelUsage;
    total_cost_usd: number | null;
    is_error: boolean | null;
    num_turns: number | null;
    session_id: string | null;
    duration_ms: number | null;
    duration_api_ms: number | null;
    usage: Record<string, any>;
};
export type SDKMessage = SDKAssistantMessage | SDKUserMessage | SDKSystemMessage | SDKResultMessage;
export type ModelUsage = {
    [key: string]: any;
};
export type QueryOptions = {
    [key: string]: any;
};
export type BetaContentBlock = {
    [key: string]: any;
};
export type BetaToolUseBlock = {
    [key: string]: any;
};
