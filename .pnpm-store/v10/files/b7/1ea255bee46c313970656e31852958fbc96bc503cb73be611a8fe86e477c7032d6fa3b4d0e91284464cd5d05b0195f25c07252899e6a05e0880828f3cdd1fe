import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Text to classify.
 */
export type ClassificationRequestInputs = string | Array<string>;
export type ClassificationRequest = {
    /**
     * ID of the model to use.
     */
    model: string;
    /**
     * Text to classify.
     */
    inputs: string | Array<string>;
};
/** @internal */
export declare const ClassificationRequestInputs$inboundSchema: z.ZodType<ClassificationRequestInputs, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassificationRequestInputs$Outbound = string | Array<string>;
/** @internal */
export declare const ClassificationRequestInputs$outboundSchema: z.ZodType<ClassificationRequestInputs$Outbound, z.ZodTypeDef, ClassificationRequestInputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassificationRequestInputs$ {
    /** @deprecated use `ClassificationRequestInputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassificationRequestInputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassificationRequestInputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassificationRequestInputs$Outbound, z.ZodTypeDef, ClassificationRequestInputs>;
    /** @deprecated use `ClassificationRequestInputs$Outbound` instead. */
    type Outbound = ClassificationRequestInputs$Outbound;
}
export declare function classificationRequestInputsToJSON(classificationRequestInputs: ClassificationRequestInputs): string;
export declare function classificationRequestInputsFromJSON(jsonString: string): SafeParseResult<ClassificationRequestInputs, SDKValidationError>;
/** @internal */
export declare const ClassificationRequest$inboundSchema: z.ZodType<ClassificationRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassificationRequest$Outbound = {
    model: string;
    input: string | Array<string>;
};
/** @internal */
export declare const ClassificationRequest$outboundSchema: z.ZodType<ClassificationRequest$Outbound, z.ZodTypeDef, ClassificationRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassificationRequest$ {
    /** @deprecated use `ClassificationRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassificationRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassificationRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassificationRequest$Outbound, z.ZodTypeDef, ClassificationRequest>;
    /** @deprecated use `ClassificationRequest$Outbound` instead. */
    type Outbound = ClassificationRequest$Outbound;
}
export declare function classificationRequestToJSON(classificationRequest: ClassificationRequest): string;
export declare function classificationRequestFromJSON(jsonString: string): SafeParseResult<ClassificationRequest, SDKValidationError>;
//# sourceMappingURL=classificationrequest.d.ts.map