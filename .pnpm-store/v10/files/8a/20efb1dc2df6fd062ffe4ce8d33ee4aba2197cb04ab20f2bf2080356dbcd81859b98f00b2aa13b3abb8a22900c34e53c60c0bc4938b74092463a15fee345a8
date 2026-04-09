import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MetricOut } from "./metricout.js";
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
export declare function checkpointOutFromJSON(jsonString: string): SafeParseResult<CheckpointOut, SDKValidationError>;
//# sourceMappingURL=checkpointout.d.ts.map