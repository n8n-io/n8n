import { LLMClient } from "../lib/llm/LLMClient";
export interface ActCommandParams {
    action: string;
    steps?: string;
    domElements: string;
    llmClient: LLMClient;
    retries?: number;
    logger: (message: {
        category?: string;
        message: string;
    }) => void;
    requestId: string;
    variables?: Record<string, string>;
    userProvidedInstructions?: string;
}
export interface ActCommandResult {
    method: string;
    element: number;
    args: unknown[];
    completed: boolean;
    step: string;
    why?: string;
}
export declare enum SupportedPlaywrightAction {
    CLICK = "click",
    FILL = "fill",
    TYPE = "type"
}
