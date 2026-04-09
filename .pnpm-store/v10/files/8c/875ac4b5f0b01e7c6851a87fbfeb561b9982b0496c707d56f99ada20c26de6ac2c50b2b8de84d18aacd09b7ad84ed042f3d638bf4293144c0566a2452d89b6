import * as z from "zod/v3";
/**
 * Text to classify.
 */
export type ClassificationRequestInputs = string | Array<string>;
export type ClassificationRequest = {
    /**
     * ID of the model to use.
     */
    model: string;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    /**
     * Text to classify.
     */
    inputs: string | Array<string>;
};
/** @internal */
export type ClassificationRequestInputs$Outbound = string | Array<string>;
/** @internal */
export declare const ClassificationRequestInputs$outboundSchema: z.ZodType<ClassificationRequestInputs$Outbound, z.ZodTypeDef, ClassificationRequestInputs>;
export declare function classificationRequestInputsToJSON(classificationRequestInputs: ClassificationRequestInputs): string;
/** @internal */
export type ClassificationRequest$Outbound = {
    model: string;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    input: string | Array<string>;
};
/** @internal */
export declare const ClassificationRequest$outboundSchema: z.ZodType<ClassificationRequest$Outbound, z.ZodTypeDef, ClassificationRequest>;
export declare function classificationRequestToJSON(classificationRequest: ClassificationRequest): string;
//# sourceMappingURL=classificationrequest.d.ts.map