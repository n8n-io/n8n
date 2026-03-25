import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ModelCapabilities = {
    completionChat?: boolean | undefined;
    completionFim?: boolean | undefined;
    functionCalling?: boolean | undefined;
    fineTuning?: boolean | undefined;
    vision?: boolean | undefined;
    classification?: boolean | undefined;
};
/** @internal */
export declare const ModelCapabilities$inboundSchema: z.ZodType<ModelCapabilities, z.ZodTypeDef, unknown>;
/** @internal */
export type ModelCapabilities$Outbound = {
    completion_chat: boolean;
    completion_fim: boolean;
    function_calling: boolean;
    fine_tuning: boolean;
    vision: boolean;
    classification: boolean;
};
/** @internal */
export declare const ModelCapabilities$outboundSchema: z.ZodType<ModelCapabilities$Outbound, z.ZodTypeDef, ModelCapabilities>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelCapabilities$ {
    /** @deprecated use `ModelCapabilities$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModelCapabilities, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModelCapabilities$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModelCapabilities$Outbound, z.ZodTypeDef, ModelCapabilities>;
    /** @deprecated use `ModelCapabilities$Outbound` instead. */
    type Outbound = ModelCapabilities$Outbound;
}
export declare function modelCapabilitiesToJSON(modelCapabilities: ModelCapabilities): string;
export declare function modelCapabilitiesFromJSON(jsonString: string): SafeParseResult<ModelCapabilities, SDKValidationError>;
//# sourceMappingURL=modelcapabilities.d.ts.map