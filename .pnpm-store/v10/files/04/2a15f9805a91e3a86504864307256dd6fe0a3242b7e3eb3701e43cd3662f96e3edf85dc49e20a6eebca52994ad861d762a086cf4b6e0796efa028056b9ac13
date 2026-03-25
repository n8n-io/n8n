import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentOut, DocumentOut$Outbound } from "./documentout.js";
import { PaginationInfo, PaginationInfo$Outbound } from "./paginationinfo.js";
export type ListDocumentOut = {
    pagination: PaginationInfo;
    data: Array<DocumentOut>;
};
/** @internal */
export declare const ListDocumentOut$inboundSchema: z.ZodType<ListDocumentOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ListDocumentOut$Outbound = {
    pagination: PaginationInfo$Outbound;
    data: Array<DocumentOut$Outbound>;
};
/** @internal */
export declare const ListDocumentOut$outboundSchema: z.ZodType<ListDocumentOut$Outbound, z.ZodTypeDef, ListDocumentOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ListDocumentOut$ {
    /** @deprecated use `ListDocumentOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ListDocumentOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ListDocumentOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ListDocumentOut$Outbound, z.ZodTypeDef, ListDocumentOut>;
    /** @deprecated use `ListDocumentOut$Outbound` instead. */
    type Outbound = ListDocumentOut$Outbound;
}
export declare function listDocumentOutToJSON(listDocumentOut: ListDocumentOut): string;
export declare function listDocumentOutFromJSON(jsonString: string): SafeParseResult<ListDocumentOut, SDKValidationError>;
//# sourceMappingURL=listdocumentout.d.ts.map