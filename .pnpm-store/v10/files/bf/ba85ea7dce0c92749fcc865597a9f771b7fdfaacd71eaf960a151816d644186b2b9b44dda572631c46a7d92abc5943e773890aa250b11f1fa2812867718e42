import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { SharingOut, SharingOut$Outbound } from "./sharingout.js";
export type ListSharingOut = {
    data: Array<SharingOut>;
};
/** @internal */
export declare const ListSharingOut$inboundSchema: z.ZodType<ListSharingOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ListSharingOut$Outbound = {
    data: Array<SharingOut$Outbound>;
};
/** @internal */
export declare const ListSharingOut$outboundSchema: z.ZodType<ListSharingOut$Outbound, z.ZodTypeDef, ListSharingOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ListSharingOut$ {
    /** @deprecated use `ListSharingOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ListSharingOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ListSharingOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ListSharingOut$Outbound, z.ZodTypeDef, ListSharingOut>;
    /** @deprecated use `ListSharingOut$Outbound` instead. */
    type Outbound = ListSharingOut$Outbound;
}
export declare function listSharingOutToJSON(listSharingOut: ListSharingOut): string;
export declare function listSharingOutFromJSON(jsonString: string): SafeParseResult<ListSharingOut, SDKValidationError>;
//# sourceMappingURL=listsharingout.d.ts.map