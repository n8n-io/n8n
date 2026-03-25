import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FTModelCapabilitiesOut, FTModelCapabilitiesOut$Outbound } from "./ftmodelcapabilitiesout.js";
export declare const CompletionFTModelOutObject: {
    readonly Model: "model";
};
export type CompletionFTModelOutObject = ClosedEnum<typeof CompletionFTModelOutObject>;
export declare const ModelType: {
    readonly Completion: "completion";
};
export type ModelType = ClosedEnum<typeof ModelType>;
export type CompletionFTModelOut = {
    id: string;
    object?: CompletionFTModelOutObject | undefined;
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
    modelType?: ModelType | undefined;
};
/** @internal */
export declare const CompletionFTModelOutObject$inboundSchema: z.ZodNativeEnum<typeof CompletionFTModelOutObject>;
/** @internal */
export declare const CompletionFTModelOutObject$outboundSchema: z.ZodNativeEnum<typeof CompletionFTModelOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionFTModelOutObject$ {
    /** @deprecated use `CompletionFTModelOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
    /** @deprecated use `CompletionFTModelOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
}
/** @internal */
export declare const ModelType$inboundSchema: z.ZodNativeEnum<typeof ModelType>;
/** @internal */
export declare const ModelType$outboundSchema: z.ZodNativeEnum<typeof ModelType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelType$ {
    /** @deprecated use `ModelType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
    /** @deprecated use `ModelType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
}
/** @internal */
export declare const CompletionFTModelOut$inboundSchema: z.ZodType<CompletionFTModelOut, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionFTModelOut$Outbound = {
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
    model_type: string;
};
/** @internal */
export declare const CompletionFTModelOut$outboundSchema: z.ZodType<CompletionFTModelOut$Outbound, z.ZodTypeDef, CompletionFTModelOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionFTModelOut$ {
    /** @deprecated use `CompletionFTModelOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionFTModelOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionFTModelOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionFTModelOut$Outbound, z.ZodTypeDef, CompletionFTModelOut>;
    /** @deprecated use `CompletionFTModelOut$Outbound` instead. */
    type Outbound = CompletionFTModelOut$Outbound;
}
export declare function completionFTModelOutToJSON(completionFTModelOut: CompletionFTModelOut): string;
export declare function completionFTModelOutFromJSON(jsonString: string): SafeParseResult<CompletionFTModelOut, SDKValidationError>;
//# sourceMappingURL=completionftmodelout.d.ts.map