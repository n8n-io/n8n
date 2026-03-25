import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FTModelCapabilitiesOut = {
    completionChat?: boolean | undefined;
    completionFim?: boolean | undefined;
    functionCalling?: boolean | undefined;
    fineTuning?: boolean | undefined;
    classification?: boolean | undefined;
};
/** @internal */
export declare const FTModelCapabilitiesOut$inboundSchema: z.ZodType<FTModelCapabilitiesOut, z.ZodTypeDef, unknown>;
/** @internal */
export type FTModelCapabilitiesOut$Outbound = {
    completion_chat: boolean;
    completion_fim: boolean;
    function_calling: boolean;
    fine_tuning: boolean;
    classification: boolean;
};
/** @internal */
export declare const FTModelCapabilitiesOut$outboundSchema: z.ZodType<FTModelCapabilitiesOut$Outbound, z.ZodTypeDef, FTModelCapabilitiesOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FTModelCapabilitiesOut$ {
    /** @deprecated use `FTModelCapabilitiesOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FTModelCapabilitiesOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `FTModelCapabilitiesOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FTModelCapabilitiesOut$Outbound, z.ZodTypeDef, FTModelCapabilitiesOut>;
    /** @deprecated use `FTModelCapabilitiesOut$Outbound` instead. */
    type Outbound = FTModelCapabilitiesOut$Outbound;
}
export declare function ftModelCapabilitiesOutToJSON(ftModelCapabilitiesOut: FTModelCapabilitiesOut): string;
export declare function ftModelCapabilitiesOutFromJSON(jsonString: string): SafeParseResult<FTModelCapabilitiesOut, SDKValidationError>;
//# sourceMappingURL=ftmodelcapabilitiesout.d.ts.map