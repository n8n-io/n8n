import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Prediction = {
    type?: "content" | undefined;
    content?: string | undefined;
};
/** @internal */
export declare const Prediction$inboundSchema: z.ZodType<Prediction, z.ZodTypeDef, unknown>;
/** @internal */
export type Prediction$Outbound = {
    type: "content";
    content: string;
};
/** @internal */
export declare const Prediction$outboundSchema: z.ZodType<Prediction$Outbound, z.ZodTypeDef, Prediction>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Prediction$ {
    /** @deprecated use `Prediction$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Prediction, z.ZodTypeDef, unknown>;
    /** @deprecated use `Prediction$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Prediction$Outbound, z.ZodTypeDef, Prediction>;
    /** @deprecated use `Prediction$Outbound` instead. */
    type Outbound = Prediction$Outbound;
}
export declare function predictionToJSON(prediction: Prediction): string;
export declare function predictionFromJSON(jsonString: string): SafeParseResult<Prediction, SDKValidationError>;
//# sourceMappingURL=prediction.d.ts.map