import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentOut } from "./documentout.js";
import { PaginationInfo } from "./paginationinfo.js";
export type ListDocumentOut = {
    pagination: PaginationInfo;
    data: Array<DocumentOut>;
};
/** @internal */
export declare const ListDocumentOut$inboundSchema: z.ZodType<ListDocumentOut, z.ZodTypeDef, unknown>;
export declare function listDocumentOutFromJSON(jsonString: string): SafeParseResult<ListDocumentOut, SDKValidationError>;
//# sourceMappingURL=listdocumentout.d.ts.map