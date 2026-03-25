import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const DocumentLibraryToolType: {
    readonly DocumentLibrary: "document_library";
};
export type DocumentLibraryToolType = ClosedEnum<typeof DocumentLibraryToolType>;
export type DocumentLibraryTool = {
    type?: DocumentLibraryToolType | undefined;
    /**
     * Ids of the library in which to search.
     */
    libraryIds: Array<string>;
};
/** @internal */
export declare const DocumentLibraryToolType$inboundSchema: z.ZodNativeEnum<typeof DocumentLibraryToolType>;
/** @internal */
export declare const DocumentLibraryToolType$outboundSchema: z.ZodNativeEnum<typeof DocumentLibraryToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DocumentLibraryToolType$ {
    /** @deprecated use `DocumentLibraryToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly DocumentLibrary: "document_library";
    }>;
    /** @deprecated use `DocumentLibraryToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly DocumentLibrary: "document_library";
    }>;
}
/** @internal */
export declare const DocumentLibraryTool$inboundSchema: z.ZodType<DocumentLibraryTool, z.ZodTypeDef, unknown>;
/** @internal */
export type DocumentLibraryTool$Outbound = {
    type: string;
    library_ids: Array<string>;
};
/** @internal */
export declare const DocumentLibraryTool$outboundSchema: z.ZodType<DocumentLibraryTool$Outbound, z.ZodTypeDef, DocumentLibraryTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DocumentLibraryTool$ {
    /** @deprecated use `DocumentLibraryTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<DocumentLibraryTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `DocumentLibraryTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<DocumentLibraryTool$Outbound, z.ZodTypeDef, DocumentLibraryTool>;
    /** @deprecated use `DocumentLibraryTool$Outbound` instead. */
    type Outbound = DocumentLibraryTool$Outbound;
}
export declare function documentLibraryToolToJSON(documentLibraryTool: DocumentLibraryTool): string;
export declare function documentLibraryToolFromJSON(jsonString: string): SafeParseResult<DocumentLibraryTool, SDKValidationError>;
//# sourceMappingURL=documentlibrarytool.d.ts.map