import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MetricOut, MetricOut$Outbound } from "./metricout.js";
export type CheckpointOut = {
    /**
     * Metrics at the step number during the fine-tuning job. Use these metrics to assess if the training is going smoothly (loss should decrease, token accuracy should increase).
     */
    metrics: MetricOut;
    /**
     * The step number that the checkpoint was created at.
     */
    stepNumber: number;
    /**
     * The UNIX timestamp (in seconds) for when the checkpoint was created.
     */
    createdAt: number;
};
/** @internal */
export declare const CheckpointOut$inboundSchema: z.ZodType<CheckpointOut, z.ZodTypeDef, unknown>;
/** @internal */
export type CheckpointOut$Outbound = {
    metrics: MetricOut$Outbound;
    step_number: number;
    created_at: number;
};
/** @internal */
export declare const CheckpointOut$outboundSchema: z.ZodType<CheckpointOut$Outbound, z.ZodTypeDef, CheckpointOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CheckpointOut$ {
    /** @deprecated use `CheckpointOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CheckpointOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CheckpointOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CheckpointOut$Outbound, z.ZodTypeDef, CheckpointOut>;
    /** @deprecated use `CheckpointOut$Outbound` instead. */
    type Outbound = CheckpointOut$Outbound;
}
export declare function checkpointOutToJSON(checkpointOut: CheckpointOut): string;
export declare function checkpointOutFromJSON(jsonString: string): SafeParseResult<CheckpointOut, SDKValidationError>;
//# sourceMappingURL=checkpointout.d.ts.map