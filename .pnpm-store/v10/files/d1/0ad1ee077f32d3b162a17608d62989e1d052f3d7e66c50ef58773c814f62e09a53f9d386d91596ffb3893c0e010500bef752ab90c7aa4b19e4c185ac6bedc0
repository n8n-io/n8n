import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesDocumentsListV1Request = {
    libraryId: string;
    search?: string | null | undefined;
    pageSize?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: string | undefined;
};
/** @internal */
export declare const LibrariesDocumentsListV1Request$inboundSchema: z.ZodType<LibrariesDocumentsListV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesDocumentsListV1Request$Outbound = {
    library_id: string;
    search?: string | null | undefined;
    page_size: number;
    page: number;
    sort_by: string;
    sort_order: string;
};
/** @internal */
export declare const LibrariesDocumentsListV1Request$outboundSchema: z.ZodType<LibrariesDocumentsListV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsListV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesDocumentsListV1Request$ {
    /** @deprecated use `LibrariesDocumentsListV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesDocumentsListV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesDocumentsListV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesDocumentsListV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsListV1Request>;
    /** @deprecated use `LibrariesDocumentsListV1Request$Outbound` instead. */
    type Outbound = LibrariesDocumentsListV1Request$Outbound;
}
export declare function librariesDocumentsListV1RequestToJSON(librariesDocumentsListV1Request: LibrariesDocumentsListV1Request): string;
export declare function librariesDocumentsListV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesDocumentsListV1Request, SDKValidationError>;
//# sourceMappingURL=librariesdocumentslistv1.d.ts.map