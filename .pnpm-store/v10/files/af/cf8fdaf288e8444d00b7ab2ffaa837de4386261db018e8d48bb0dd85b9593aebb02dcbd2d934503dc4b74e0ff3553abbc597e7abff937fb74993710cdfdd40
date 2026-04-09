/**
 * See the registered mapping of HF model ID => Nebius model ID here:
 *
 * https://huggingface.co/api/partners/nebius/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Nebius and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Nebius, please open an issue on the present repo
 * and we will tag Nebius team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams, OutputType } from "../types.js";
import { BaseConversationalTask, BaseTextGenerationTask, TaskProviderHelper, type FeatureExtractionTaskHelper, type TextToImageTaskHelper } from "./providerHelper.js";
import type { ChatCompletionInput } from "../../../tasks/dist/commonjs/index.js";
interface NebiusImageGeneration {
    data: Array<{
        b64_json?: string;
        url?: string;
    }>;
}
interface NebiusEmbeddingsResponse {
    data: Array<{
        embedding: number[];
    }>;
}
interface NebiusTextGenerationOutput extends Omit<TextGenerationOutput, "choices"> {
    choices: Array<{
        text: string;
    }>;
}
export declare class NebiusConversationalTask extends BaseConversationalTask {
    constructor();
    preparePayload(params: BodyParams<ChatCompletionInput>): Record<string, unknown>;
}
export declare class NebiusTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: NebiusTextGenerationOutput): Promise<TextGenerationOutput>;
}
export declare class NebiusTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeRoute(): string;
    getResponse(response: NebiusImageGeneration, url?: string, headers?: HeadersInit, outputType?: OutputType): Promise<string | Blob | Record<string, unknown>>;
}
export declare class NebiusFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeRoute(): string;
    getResponse(response: NebiusEmbeddingsResponse): Promise<FeatureExtractionOutput>;
}
export {};
//# sourceMappingURL=nebius.d.ts.map