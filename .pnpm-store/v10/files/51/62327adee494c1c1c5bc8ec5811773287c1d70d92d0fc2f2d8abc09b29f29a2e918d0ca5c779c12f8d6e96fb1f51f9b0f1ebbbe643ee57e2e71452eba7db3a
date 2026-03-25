import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const UnarchiveFTModelOutObject: {
    readonly Model: "model";
};
export type UnarchiveFTModelOutObject = ClosedEnum<typeof UnarchiveFTModelOutObject>;
export type UnarchiveFTModelOut = {
    id: string;
    object?: UnarchiveFTModelOutObject | undefined;
    archived?: boolean | undefined;
};
/** @internal */
export declare const UnarchiveFTModelOutObject$inboundSchema: z.ZodNativeEnum<typeof UnarchiveFTModelOutObject>;
/** @internal */
export declare const UnarchiveFTModelOutObject$outboundSchema: z.ZodNativeEnum<typeof UnarchiveFTModelOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UnarchiveFTModelOutObject$ {
    /** @deprecated use `UnarchiveFTModelOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
    /** @deprecated use `UnarchiveFTModelOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
}
/** @internal */
export declare const UnarchiveFTModelOut$inboundSchema: z.ZodType<UnarchiveFTModelOut, z.ZodTypeDef, unknown>;
/** @internal */
export type UnarchiveFTModelOut$Outbound = {
    id: string;
    object: string;
    archived: boolean;
};
/** @internal */
export declare const UnarchiveFTModelOut$outboundSchema: z.ZodType<UnarchiveFTModelOut$Outbound, z.ZodTypeDef, UnarchiveFTModelOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UnarchiveFTModelOut$ {
    /** @deprecated use `UnarchiveFTModelOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<UnarchiveFTModelOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `UnarchiveFTModelOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<UnarchiveFTModelOut$Outbound, z.ZodTypeDef, UnarchiveFTModelOut>;
    /** @deprecated use `UnarchiveFTModelOut$Outbound` instead. */
    type Outbound = UnarchiveFTModelOut$Outbound;
}
export declare function unarchiveFTModelOutToJSON(unarchiveFTModelOut: UnarchiveFTModelOut): string;
export declare function unarchiveFTModelOutFromJSON(jsonString: string): SafeParseResult<UnarchiveFTModelOut, SDKValidationError>;
//# sourceMappingURL=unarchiveftmodelout.d.ts.map