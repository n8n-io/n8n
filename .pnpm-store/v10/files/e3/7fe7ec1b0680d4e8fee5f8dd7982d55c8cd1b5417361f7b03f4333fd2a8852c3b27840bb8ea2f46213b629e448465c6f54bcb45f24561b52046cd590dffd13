/**
 * See the registered mapping of HF model ID => Sambanova model ID here:
 *
 * https://huggingface.co/api/partners/sambanova/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Sambanova and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Sambanova, please open an issue on the present repo
 * and we will tag Sambanova team members.
 *
 * Thanks!
 */
import type { FeatureExtractionOutput } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import type { FeatureExtractionTaskHelper } from "./providerHelper.js";
import { BaseConversationalTask, TaskProviderHelper } from "./providerHelper.js";
import type { ChatCompletionInput } from "../../../tasks/dist/commonjs/index.js";
export declare class SambanovaConversationalTask extends BaseConversationalTask {
    constructor();
    preparePayload(params: BodyParams<ChatCompletionInput>): Record<string, unknown>;
}
export declare class SambanovaFeatureExtractionTask extends TaskProviderHelper implements FeatureExtractionTaskHelper {
    constructor();
    makeRoute(): string;
    getResponse(response: FeatureExtractionOutput): Promise<FeatureExtractionOutput>;
    preparePayload(params: BodyParams): Record<string, unknown>;
}
//# sourceMappingURL=sambanova.d.ts.map