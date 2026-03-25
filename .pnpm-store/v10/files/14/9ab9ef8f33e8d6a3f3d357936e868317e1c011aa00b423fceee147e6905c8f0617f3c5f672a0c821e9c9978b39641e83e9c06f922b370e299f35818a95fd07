import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassificationTargetResult, ClassificationTargetResult$Outbound } from "./classificationtargetresult.js";
export type ClassificationResponse = {
    id: string;
    model: string;
    results: Array<{
        [k: string]: ClassificationTargetResult;
    }>;
};
/** @internal */
export declare const ClassificationResponse$inboundSchema: z.ZodType<ClassificationResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassificationResponse$Outbound = {
    id: string;
    model: string;
    results: Array<{
        [k: string]: ClassificationTargetResult$Outbound;
    }>;
};
/** @internal */
export declare const ClassificationResponse$outboundSchema: z.ZodType<ClassificationResponse$Outbound, z.ZodTypeDef, ClassificationResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassificationResponse$ {
    /** @deprecated use `ClassificationResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassificationResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassificationResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassificationResponse$Outbound, z.ZodTypeDef, ClassificationResponse>;
    /** @deprecated use `ClassificationResponse$Outbound` instead. */
    type Outbound = ClassificationResponse$Outbound;
}
export declare function classificationResponseToJSON(classificationResponse: ClassificationResponse): string;
export declare function classificationResponseFromJSON(jsonString: string): SafeParseResult<ClassificationResponse, SDKValidationError>;
//# sourceMappingURL=classificationresponse.d.ts.map