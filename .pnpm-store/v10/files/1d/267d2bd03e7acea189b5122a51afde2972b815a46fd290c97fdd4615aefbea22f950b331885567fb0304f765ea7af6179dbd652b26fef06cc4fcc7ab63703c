import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type SharingOut = {
    libraryId: string;
    userId?: string | null | undefined;
    orgId: string;
    role: string;
    shareWithType: string;
    shareWithUuid: string;
};
/** @internal */
export declare const SharingOut$inboundSchema: z.ZodType<SharingOut, z.ZodTypeDef, unknown>;
/** @internal */
export type SharingOut$Outbound = {
    library_id: string;
    user_id?: string | null | undefined;
    org_id: string;
    role: string;
    share_with_type: string;
    share_with_uuid: string;
};
/** @internal */
export declare const SharingOut$outboundSchema: z.ZodType<SharingOut$Outbound, z.ZodTypeDef, SharingOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SharingOut$ {
    /** @deprecated use `SharingOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SharingOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `SharingOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SharingOut$Outbound, z.ZodTypeDef, SharingOut>;
    /** @deprecated use `SharingOut$Outbound` instead. */
    type Outbound = SharingOut$Outbound;
}
export declare function sharingOutToJSON(sharingOut: SharingOut): string;
export declare function sharingOutFromJSON(jsonString: string): SafeParseResult<SharingOut, SDKValidationError>;
//# sourceMappingURL=sharingout.d.ts.map