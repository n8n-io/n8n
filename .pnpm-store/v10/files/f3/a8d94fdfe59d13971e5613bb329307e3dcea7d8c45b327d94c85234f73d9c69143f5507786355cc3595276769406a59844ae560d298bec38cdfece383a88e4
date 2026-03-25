import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { LibraryOut, LibraryOut$Outbound } from "./libraryout.js";
export type ListLibraryOut = {
    data: Array<LibraryOut>;
};
/** @internal */
export declare const ListLibraryOut$inboundSchema: z.ZodType<ListLibraryOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ListLibraryOut$Outbound = {
    data: Array<LibraryOut$Outbound>;
};
/** @internal */
export declare const ListLibraryOut$outboundSchema: z.ZodType<ListLibraryOut$Outbound, z.ZodTypeDef, ListLibraryOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ListLibraryOut$ {
    /** @deprecated use `ListLibraryOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ListLibraryOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ListLibraryOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ListLibraryOut$Outbound, z.ZodTypeDef, ListLibraryOut>;
    /** @deprecated use `ListLibraryOut$Outbound` instead. */
    type Outbound = ListLibraryOut$Outbound;
}
export declare function listLibraryOutToJSON(listLibraryOut: ListLibraryOut): string;
export declare function listLibraryOutFromJSON(jsonString: string): SafeParseResult<ListLibraryOut, SDKValidationError>;
//# sourceMappingURL=listlibraryout.d.ts.map