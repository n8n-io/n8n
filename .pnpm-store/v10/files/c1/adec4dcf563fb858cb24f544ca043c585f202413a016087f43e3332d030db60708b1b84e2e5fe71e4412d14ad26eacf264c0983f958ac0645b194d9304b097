import { LLMClient } from "../lib/llm/LLMClient";
import { LLMProvider } from "../lib/llm/LLMProvider";
export interface VerifyActCompletionParams {
    goal: string;
    steps: string;
    llmProvider: LLMProvider;
    llmClient: LLMClient;
    domElements?: string;
    logger: (message: {
        category?: string;
        message: string;
    }) => void;
    requestId: string;
}
