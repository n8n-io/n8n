import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ClassificationTargetResult = {
    scores: {
        [k: string]: number;
    };
};
/** @internal */
export declare const ClassificationTargetResult$inboundSchema: z.ZodType<ClassificationTargetResult, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassificationTargetResult$Outbound = {
    scores: {
        [k: string]: number;
    };
};
/** @internal */
export declare const ClassificationTargetResult$outboundSchema: z.ZodType<ClassificationTargetResult$Outbound, z.ZodTypeDef, ClassificationTargetResult>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassificationTargetResult$ {
    /** @deprecated use `ClassificationTargetResult$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassificationTargetResult, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassificationTargetResult$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassificationTargetResult$Outbound, z.ZodTypeDef, ClassificationTargetResult>;
    /** @deprecated use `ClassificationTargetResult$Outbound` instead. */
    type Outbound = ClassificationTargetResult$Outbound;
}
export declare function classificationTargetResultToJSON(classificationTargetResult: ClassificationTargetResult): string;
export declare function classificationTargetResultFromJSON(jsonString: string): SafeParseResult<ClassificationTargetResult, SDKValidationError>;
//# sourceMappingURL=classificationtargetresult.d.ts.map