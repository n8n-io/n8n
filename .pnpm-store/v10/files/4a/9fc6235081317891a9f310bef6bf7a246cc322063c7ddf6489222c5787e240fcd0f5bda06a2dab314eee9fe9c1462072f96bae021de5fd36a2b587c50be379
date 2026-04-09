import * as z from "zod/v3";
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
export declare function classifierTargetOutFromJSON(jsonString: string): SafeParseResult<ClassifierTargetOut, SDKValidationError>;
//# sourceMappingURL=classifiertargetout.d.ts.map