/**
 * See the registered mapping of HF model ID => Scaleway model ID here:
 *
 * https://huggingface.co/api/partners/scaleway/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Scaleway and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Scaleway, please open an issue on the present repo
 * and we will tag Scaleway team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput, TextGenerationOutput } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import type { FeatureExtractionTaskHelper } from "./providerHelper.js";
import { BaseConversationalTask, TaskProviderHelper, BaseTextGenerationTask } from "./providerHelper.js";
interface ScalewayEmbeddingsResponse {
    data: Array<{
        embedding: number[];
    }>;
}
export declare class ScalewayConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class ScalewayTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    getResponse(response: unknown): Promise<TextGenerationOutput>;
}
export declare class ScalewayFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
    constructor();
    preparePayload(params: BodyParams): Record<string, unknown>;
    makeRoute(): string;
    getResponse(response: ScalewayEmbeddingsResponse): Promise<FeatureExtractionOutput>;
}
export {};
//# sourceMappingURL=scaleway.d.ts.map