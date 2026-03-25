import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FTClassifierLossFunction } from "./ftclassifierlossfunction.js";
export type ClassifierTargetIn = {
    name: string;
    labels: Array<string>;
    weight?: number | undefined;
    lossFunction?: FTClassifierLossFunction | null | undefined;
};
/** @internal */
export declare const ClassifierTargetIn$inboundSchema: z.ZodType<ClassifierTargetIn, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierTargetIn$Outbound = {
    name: string;
    labels: Array<string>;
    weight: number;
    loss_function?: string | null | undefined;
};
/** @internal */
export declare const ClassifierTargetIn$outboundSchema: z.ZodType<ClassifierTargetIn$Outbound, z.ZodTypeDef, ClassifierTargetIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierTargetIn$ {
    /** @deprecated use `ClassifierTargetIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierTargetIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierTargetIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierTargetIn$Outbound, z.ZodTypeDef, ClassifierTargetIn>;
    /** @deprecated use `ClassifierTargetIn$Outbound` instead. */
    type Outbound = ClassifierTargetIn$Outbound;
}
export declare function classifierTargetInToJSON(classifierTargetIn: ClassifierTargetIn): string;
export declare function classifierTargetInFromJSON(jsonString: string): SafeParseResult<ClassifierTargetIn, SDKValidationError>;
//# sourceMappingURL=classifiertargetin.d.ts.map