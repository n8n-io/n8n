import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type PaginationInfo = {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
};
/** @internal */
export declare const PaginationInfo$inboundSchema: z.ZodType<PaginationInfo, z.ZodTypeDef, unknown>;
/** @internal */
export type PaginationInfo$Outbound = {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    has_more: boolean;
};
/** @internal */
export declare const PaginationInfo$outboundSchema: z.ZodType<PaginationInfo$Outbound, z.ZodTypeDef, PaginationInfo>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace PaginationInfo$ {
    /** @deprecated use `PaginationInfo$inboundSchema` instead. */
    const inboundSchema: z.ZodType<PaginationInfo, z.ZodTypeDef, unknown>;
    /** @deprecated use `PaginationInfo$outboundSchema` instead. */
    const outboundSchema: z.ZodType<PaginationInfo$Outbound, z.ZodTypeDef, PaginationInfo>;
    /** @deprecated use `PaginationInfo$Outbound` instead. */
    type Outbound = PaginationInfo$Outbound;
}
export declare function paginationInfoToJSON(paginationInfo: PaginationInfo): string;
export declare function paginationInfoFromJSON(jsonString: string): SafeParseResult<PaginationInfo, SDKValidationError>;
//# sourceMappingURL=paginationinfo.d.ts.map