import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const LegacyJobMetadataOutObject: {
    readonly JobMetadata: "job.metadata";
};
export type LegacyJobMetadataOutObject = ClosedEnum<typeof LegacyJobMetadataOutObject>;
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
    deprecated?: boolean | undefined;
    details: string;
    /**
     * The number of complete passes through the entire training dataset.
     */
    epochs?: number | null | undefined;
    /**
     * The number of training steps to perform. A training step refers to a single update of the model weights during the fine-tuning process. This update is typically calculated using a batch of samples from the training dataset.
     */
    trainingSteps?: number | null | undefined;
    object?: LegacyJobMetadataOutObject | undefined;
};
/** @internal */
export declare const LegacyJobMetadataOutObject$inboundSchema: z.ZodNativeEnum<typeof LegacyJobMetadataOutObject>;
/** @internal */
export declare const LegacyJobMetadataOutObject$outboundSchema: z.ZodNativeEnum<typeof LegacyJobMetadataOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LegacyJobMetadataOutObject$ {
    /** @deprecated use `LegacyJobMetadataOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly JobMetadata: "job.metadata";
    }>;
    /** @deprecated use `LegacyJobMetadataOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly JobMetadata: "job.metadata";
    }>;
}
/** @internal */
export declare const LegacyJobMetadataOut$inboundSchema: z.ZodType<LegacyJobMetadataOut, z.ZodTypeDef, unknown>;
/** @internal */
export type LegacyJobMetadataOut$Outbound = {
    expected_duration_seconds?: number | null | undefined;
    cost?: number | null | undefined;
    cost_currency?: string | null | undefined;
    train_tokens_per_step?: number | null | undefined;
    train_tokens?: number | null | undefined;
    data_tokens?: number | null | undefined;
    estimated_start_time?: number | null | undefined;
    deprecated: boolean;
    details: string;
    epochs?: number | null | undefined;
    training_steps?: number | null | undefined;
    object: string;
};
/** @internal */
export declare const LegacyJobMetadataOut$outboundSchema: z.ZodType<LegacyJobMetadataOut$Outbound, z.ZodTypeDef, LegacyJobMetadataOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LegacyJobMetadataOut$ {
    /** @deprecated use `LegacyJobMetadataOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LegacyJobMetadataOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `LegacyJobMetadataOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LegacyJobMetadataOut$Outbound, z.ZodTypeDef, LegacyJobMetadataOut>;
    /** @deprecated use `LegacyJobMetadataOut$Outbound` instead. */
    type Outbound = LegacyJobMetadataOut$Outbound;
}
export declare function legacyJobMetadataOutToJSON(legacyJobMetadataOut: LegacyJobMetadataOut): string;
export declare function legacyJobMetadataOutFromJSON(jsonString: string): SafeParseResult<LegacyJobMetadataOut, SDKValidationError>;
//# sourceMappingURL=legacyjobmetadataout.d.ts.map