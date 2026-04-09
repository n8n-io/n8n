import * as z from "zod/v3";
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
export declare function paginationInfoFromJSON(jsonString: string): SafeParseResult<PaginationInfo, SDKValidationError>;
//# sourceMappingURL=paginationinfo.d.ts.map