import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Enable users to specify an expected completion, optimizing response times by leveraging known or predictable content.
 */
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
export declare function predictionToJSON(prediction: Prediction): string;
export declare function predictionFromJSON(jsonString: string): SafeParseResult<Prediction, SDKValidationError>;
//# sourceMappingURL=prediction.d.ts.map