import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LegacyJobMetadataOut = {
    /**
     * The approximated time (in seconds) for the fine-tuning process to complete.
     */
    expectedDurationSeconds?: number | null | undefined;
    /**
     * The cost of the fine-tuning job.
     */
    cost?: number | null | undefined;
    /**
     * The currency used for the fine-tuning job cost.
     */
    costCurrency?: string | null | undefined;
    /**
     * The number of tokens consumed by one training step.
     */
    trainTokensPerStep?: number | null | undefined;
    /**
     * The total number of tokens used during the fine-tuning process.
     */
    trainTokens?: number | null | undefined;
    /**
     * The total number of tokens in the training dataset.
     */
    dataTokens?: number | null | undefined;
    estimatedStartTime?: number | null | undefined;
    deprecated: boolean | undefined;
    details: string;
    /**
     * The number of complete passes through the entire training dataset.
     */
    epochs?: number | null | undefined;
    /**
     * The number of training steps to perform. A training step refers to a single update of the model weights during the fine-tuning process. This update is typically calculated using a batch of samples from the training dataset.
     */
    trainingSteps?: number | null | undefined;
    object?: "job.metadata" | undefined;
};
/** @internal */
export declare const LegacyJobMetadataOut$inboundSchema: z.ZodType<LegacyJobMetadataOut, z.ZodTypeDef, unknown>;
export declare function legacyJobMetadataOutFromJSON(jsonString: string): SafeParseResult<LegacyJobMetadataOut, SDKValidationError>;
//# sourceMappingURL=legacyjobmetadataout.d.ts.map