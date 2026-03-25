/**
 * See the registered mapping of HF model ID => Together model ID here:
 *
 * https://huggingface.co/api/partners/together/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Together and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Together, please open an issue on the present repo
 * and we will tag Together team members.
 *
 * Thanks!
 */
import type { ChatCompletionOutput, TextGenerationOutput, TextGenerationOutputFinishReason } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";
interface TogetherTextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
    choices: Array<{
        text: string;
        finish_reason: TextGenerationOutputFinishReason;
        seed: number;
        logprobs: unknown;
        index: number;
    }>;
}
interface TogetherBase64ImageGeneration {
    data: Array<{
        b64_json: string;
    }>;
}
export declare class TogetherConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class TogetherTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: TogetherTextCompletionOutput): Promise<TextGenerationOutput>;
}
export declare class TogetherTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    makeRoute(): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: TogetherBase64ImageGeneration, outputType?: "url" | "blob"): Promise<string | Blob>;
}
export {};
//# sourceMappingURL=together.d.ts.map