import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const ArchiveFTModelOutObject: {
    readonly Model: "model";
};
export type ArchiveFTModelOutObject = ClosedEnum<typeof ArchiveFTModelOutObject>;
export type ArchiveFTModelOut = {
    id: string;
    object?: ArchiveFTModelOutObject | undefined;
    archived?: boolean | undefined;
};
/** @internal */
export declare const ArchiveFTModelOutObject$inboundSchema: z.ZodNativeEnum<typeof ArchiveFTModelOutObject>;
/** @internal */
export declare const ArchiveFTModelOutObject$outboundSchema: z.ZodNativeEnum<typeof ArchiveFTModelOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ArchiveFTModelOutObject$ {
    /** @deprecated use `ArchiveFTModelOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
    /** @deprecated use `ArchiveFTModelOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Model: "model";
    }>;
}
/** @internal */
export declare const ArchiveFTModelOut$inboundSchema: z.ZodType<ArchiveFTModelOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ArchiveFTModelOut$Outbound = {
    id: string;
    object: string;
    archived: boolean;
};
/** @internal */
export declare const ArchiveFTModelOut$outboundSchema: z.ZodType<ArchiveFTModelOut$Outbound, z.ZodTypeDef, ArchiveFTModelOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ArchiveFTModelOut$ {
    /** @deprecated use `ArchiveFTModelOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ArchiveFTModelOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ArchiveFTModelOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ArchiveFTModelOut$Outbound, z.ZodTypeDef, ArchiveFTModelOut>;
    /** @deprecated use `ArchiveFTModelOut$Outbound` instead. */
    type Outbound = ArchiveFTModelOut$Outbound;
}
export declare function archiveFTModelOutToJSON(archiveFTModelOut: ArchiveFTModelOut): string;
export declare function archiveFTModelOutFromJSON(jsonString: string): SafeParseResult<ArchiveFTModelOut, SDKValidationError>;
//# sourceMappingURL=archiveftmodelout.d.ts.map