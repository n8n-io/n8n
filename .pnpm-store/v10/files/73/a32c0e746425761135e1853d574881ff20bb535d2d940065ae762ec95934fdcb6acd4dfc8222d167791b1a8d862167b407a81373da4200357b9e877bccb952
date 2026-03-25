import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const DocumentURLChunkType: {
    readonly DocumentUrl: "document_url";
};
export type DocumentURLChunkType = ClosedEnum<typeof DocumentURLChunkType>;
export type DocumentURLChunk = {
    documentUrl: string;
    /**
     * The filename of the document
     */
    documentName?: string | null | undefined;
    type?: DocumentURLChunkType | undefined;
};
/** @internal */
export declare const DocumentURLChunkType$inboundSchema: z.ZodNativeEnum<typeof DocumentURLChunkType>;
/** @internal */
export declare const DocumentURLChunkType$outboundSchema: z.ZodNativeEnum<typeof DocumentURLChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DocumentURLChunkType$ {
    /** @deprecated use `DocumentURLChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly DocumentUrl: "document_url";
    }>;
    /** @deprecated use `DocumentURLChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly DocumentUrl: "document_url";
    }>;
}
/** @internal */
export declare const DocumentURLChunk$inboundSchema: z.ZodType<DocumentURLChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type DocumentURLChunk$Outbound = {
    document_url: string;
    document_name?: string | null | undefined;
    type: string;
};
/** @internal */
export declare const DocumentURLChunk$outboundSchema: z.ZodType<DocumentURLChunk$Outbound, z.ZodTypeDef, DocumentURLChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DocumentURLChunk$ {
    /** @deprecated use `DocumentURLChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<DocumentURLChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `DocumentURLChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<DocumentURLChunk$Outbound, z.ZodTypeDef, DocumentURLChunk>;
    /** @deprecated use `DocumentURLChunk$Outbound` instead. */
    type Outbound = DocumentURLChunk$Outbound;
}
export declare function documentURLChunkToJSON(documentURLChunk: DocumentURLChunk): string;
export declare function documentURLChunkFromJSON(jsonString: string): SafeParseResult<DocumentURLChunk, SDKValidationError>;
//# sourceMappingURL=documenturlchunk.d.ts.map