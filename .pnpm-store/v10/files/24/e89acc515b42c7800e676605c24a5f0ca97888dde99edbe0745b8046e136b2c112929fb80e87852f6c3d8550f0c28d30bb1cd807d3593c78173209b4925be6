import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Metrics at the step number during the fine-tuning job. Use these metrics to assess if the training is going smoothly (loss should decrease, token accuracy should increase).
 */
export type MetricOut = {
    trainLoss?: number | null | undefined;
    validLoss?: number | null | undefined;
    validMeanTokenAccuracy?: number | null | undefined;
};
/** @internal */
export declare const MetricOut$inboundSchema: z.ZodType<MetricOut, z.ZodTypeDef, unknown>;
export declare function metricOutFromJSON(jsonString: string): SafeParseResult<MetricOut, SDKValidationError>;
//# sourceMappingURL=metricout.d.ts.map