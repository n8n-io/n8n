import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierTargetOut, ClassifierTargetOut$Outbound } from "./classifiertargetout.js";
import { FTModelCapabilitiesOut, FTModelCapabilitiesOut$Outbound } from "./ftmodelcapabilitiesout.js";
export declare const ClassifierFTModelOutObject: {
    readonly Model: "model";
};
export type ClassifierFTModelOutObject = ClosedEnum<typeof ClassifierFTModelOutObject>;
export declare const ClassifierFTModelOutModelType: {
    readonly Classifier: "classifier";
};
export type ClassifierFTModelOutModelType = ClosedEnum<typeof ClassifierFTModelOutModelType>;
export type ClassifierFTModelOut = {
    id: string;
    object?: ClassifierFTModelOutObject | undefined;
    created: number;
    ownedBy: string;
    workspaceId: string;
    root: string;
    rootVersion: string;
    archived: boolean;
    name?: string | null | undefined;
    description?: string | null | undefined;
    capabilities: FTModelCapabilitiesOut;
    maxContextLength?: number | undefined;
    aliases?: Array<string> | undefined;
    job: string;
    classifierTargets: Array<ClassifierTargetOut>;
    modelType?: ClassifierFTModelOutModelType | undefined;
};
/** @internal */
export declare const ClassifierFTModelOutObject$inboundSchema: z.ZodNativeEnum<typeof ClassifierFTModelOutObject>;
/** @internal */
export declare const ClassifierFTModelOutObject$outboundSchema: z.ZodNativeEnum<typeof ClassifierFTModelOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierFTModelOutObject$ {
    /** @deprecated use `ClassifierFTModelOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
    /** @deprecated use `ClassifierFTModelOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
}
/** @internal */
export declare const ClassifierFTModelOutModelType$inboundSchema: z.ZodNativeEnum<typeof ClassifierFTModelOutModelType>;
/** @internal */
export declare const ClassifierFTModelOutModelType$outboundSchema: z.ZodNativeEnum<typeof ClassifierFTModelOutModelType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierFTModelOutModelType$ {
    /** @deprecated use `ClassifierFTModelOutModelType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
    /** @deprecated use `ClassifierFTModelOutModelType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
}
/** @internal */
export declare const ClassifierFTModelOut$inboundSchema: z.ZodType<ClassifierFTModelOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierFTModelOut$Outbound = {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    workspace_id: string;
    root: string;
    root_version: string;
    archived: boolean;
    name?: string | null | undefined;
    description?: string | null | undefined;
    capabilities: FTModelCapabilitiesOut$Outbound;
    max_context_length: number;
    aliases?: Array<string> | undefined;
    job: string;
    classifier_targets: Array<ClassifierTargetOut$Outbound>;
    model_type: string;
};
/** @internal */
export declare const ClassifierFTModelOut$outboundSchema: z.ZodType<ClassifierFTModelOut$Outbound, z.ZodTypeDef, ClassifierFTModelOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierFTModelOut$ {
    /** @deprecated use `ClassifierFTModelOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierFTModelOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierFTModelOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierFTModelOut$Outbound, z.ZodTypeDef, ClassifierFTModelOut>;
    /** @deprecated use `ClassifierFTModelOut$Outbound` instead. */
    type Outbound = ClassifierFTModelOut$Outbound;
}
export declare function classifierFTModelOutToJSON(classifierFTModelOut: ClassifierFTModelOut): string;
export declare function classifierFTModelOutFromJSON(jsonString: string): SafeParseResult<ClassifierFTModelOut, SDKValidationError>;
//# sourceMappingURL=classifierftmodelout.d.ts.map