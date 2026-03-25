/**
 * See the registered mapping of HF model ID => Nscale model ID here:
 *
 * https://huggingface.co/api/partners/nscale-cloud/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Nscale and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Nscale, please open an issue on the present repo
 * and we will tag Nscale team members.
 *
 * Thanks!
 */
import type { TextToImageInput } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import { BaseConversationalTask, TaskProviderHelper, type TextToImageTaskHelper } from "./providerHelper.js";
interface NscaleCloudBase64ImageGeneration {
    data: Array<{
        b64_json: string;
    }>;
}
export declare class NscaleConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class NscaleTextToImageTask extends TaskProviderHelper implements TextToImageTaskHelper {
    constructor();
    preparePayload(params: BodyParams<TextToImageInput>): Record<string, unknown>;
    makeRoute(): string;
    getResponse(response: NscaleCloudBase64ImageGeneration, url?: string, headers?: HeadersInit, outputType?: "url" | "blob"): Promise<string | Blob>;
}
export {};
//# sourceMappingURL=nscale.d.ts.map