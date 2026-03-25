import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FTClassifierLossFunction } from "./ftclassifierlossfunction.js";
export type ClassifierTargetOut = {
    name: string;
    labels: Array<string>;
    weight: number;
    lossFunction: FTClassifierLossFunction;
};
/** @internal */
export declare const ClassifierTargetOut$inboundSchema: z.ZodType<ClassifierTargetOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierTargetOut$Outbound = {
    name: string;
    labels: Array<string>;
    weight: number;
    loss_function: string;
};
/** @internal */
export declare const ClassifierTargetOut$outboundSchema: z.ZodType<ClassifierTargetOut$Outbound, z.ZodTypeDef, ClassifierTargetOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierTargetOut$ {
    /** @deprecated use `ClassifierTargetOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierTargetOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierTargetOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierTargetOut$Outbound, z.ZodTypeDef, ClassifierTargetOut>;
    /** @deprecated use `ClassifierTargetOut$Outbound` instead. */
    type Outbound = ClassifierTargetOut$Outbound;
}
export declare function classifierTargetOutToJSON(classifierTargetOut: ClassifierTargetOut): string;
export declare function classifierTargetOutFromJSON(jsonString: string): SafeParseResult<ClassifierTargetOut, SDKValidationError>;
//# sourceMappingURL=classifiertargetout.d.ts.map