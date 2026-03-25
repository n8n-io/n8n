/**
 * See the registered mapping of HF model ID => Hyperbolic model ID here:
 *
 * https://huggingface.co/api/partners/hyperbolic/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Hyperbolic and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Hyperbolic, please open an issue on the present repo
 * and we will tag Hyperbolic team members.
 *
 * Thanks!
 */
import type { ChatCompletionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams, UrlParams } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";
export interface HyperbolicTextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}
interface HyperbolicTextToImageOutput {
    images: Array<{
        image: string;
    }>;
}
export declare class HyperbolicConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class HyperbolicTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    makeRoute(): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: HyperbolicTextCompletionOutput): Promise<TextGenerationOutput>;
}
export declare class HyperbolicTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    makeRoute(params: UrlParams): string;
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: HyperbolicTextToImageOutput, url?: string, headers?: HeadersInit, outputType?: "url" | "blob"): Promise<string | Blob>;
}
export {};
//# sourceMappingURL=hyperbolic.d.ts.map