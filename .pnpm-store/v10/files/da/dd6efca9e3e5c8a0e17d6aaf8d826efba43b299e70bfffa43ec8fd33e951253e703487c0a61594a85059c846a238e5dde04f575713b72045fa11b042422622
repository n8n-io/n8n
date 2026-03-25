import type { ChatCompletionOutput, TextGenerationInput, TextGenerationOutput, TextGenerationOutputFinishReason } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask } from "./providerHelper.js";
interface FeatherlessAITextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
    choices: Array<{
        text: string;
        finish_reason: TextGenerationOutputFinishReason;
        seed: number;
        logprobs: unknown;
        index: number;
    }>;
}
export declare class FeatherlessAIConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class FeatherlessAITextGenerationTask extends BaseTextGenerationTask {
    constructor();
    preparePayload(params: BodyParams<TextGenerationInput>): Record<string, unknown>;
    getResponse(response: FeatherlessAITextCompletionOutput): Promise<TextGenerationOutput>;
}
export {};
//# sourceMappingURL=featherless-ai.d.ts.map