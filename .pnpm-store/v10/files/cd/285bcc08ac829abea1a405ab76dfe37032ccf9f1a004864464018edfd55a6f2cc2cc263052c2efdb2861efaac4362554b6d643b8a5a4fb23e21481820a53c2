/**
 * See the registered mapping of HF model ID => OVHcloud model ID here:
 *
 * https://huggingface.co/api/partners/ovhcloud/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at OVHcloud and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to OVHcloud, please open an issue on the present repo
 * and we will tag OVHcloud team members.
 *
 * Thanks!
 */
import { BaseConversationalTask, BaseTextGenerationTask } from "./providerHelper.js";
import type { ChatCompletionOutput, TextGenerationOutput, TextGenerationOutputFinishReason } from "@huggingface/tasks";
import type { BodyParams } from "../types.js";
import type { TextGenerationInput } from "@huggingface/tasks";
interface OvhCloudTextCompletionOutput extends Omit<ChatCompletionOutput, "choices"> {
    choices: Array<{
        text: string;
        finish_reason: TextGenerationOutputFinishReason;
        logprobs: unknown;
        index: number;
    }>;
}
export declare class OvhCloudConversationalTask extends BaseConversationalTask {
    constructor();
}
export declare class OvhCloudTextGenerationTask extends BaseTextGenerationTask {
    constructor();
    preparePayload(params: BodyParams<TextGenerationInput>): Record<string, unknown>;
    getResponse(response: OvhCloudTextCompletionOutput): Promise<TextGenerationOutput>;
}
export {};
//# sourceMappingURL=ovhcloud.d.ts.map