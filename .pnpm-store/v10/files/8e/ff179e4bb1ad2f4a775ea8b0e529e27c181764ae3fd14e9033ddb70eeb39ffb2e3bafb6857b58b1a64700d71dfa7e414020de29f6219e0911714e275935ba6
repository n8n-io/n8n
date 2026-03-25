import * as z from "zod";
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
/** @internal */
export type MetricOut$Outbound = {
    train_loss?: number | null | undefined;
    valid_loss?: number | null | undefined;
    valid_mean_token_accuracy?: number | null | undefined;
};
/** @internal */
export declare const MetricOut$outboundSchema: z.ZodType<MetricOut$Outbound, z.ZodTypeDef, MetricOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MetricOut$ {
    /** @deprecated use `MetricOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MetricOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `MetricOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MetricOut$Outbound, z.ZodTypeDef, MetricOut>;
    /** @deprecated use `MetricOut$Outbound` instead. */
    type Outbound = MetricOut$Outbound;
}
export declare function metricOutToJSON(metricOut: MetricOut): string;
export declare function metricOutFromJSON(jsonString: string): SafeParseResult<MetricOut, SDKValidationError>;
//# sourceMappingURL=metricout.d.ts.map