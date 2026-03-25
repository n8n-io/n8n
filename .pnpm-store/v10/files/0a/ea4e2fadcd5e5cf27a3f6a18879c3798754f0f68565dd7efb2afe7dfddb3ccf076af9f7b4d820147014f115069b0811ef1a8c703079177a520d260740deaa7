import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type DocumentOut = {
    id: string;
    libraryId: string;
    hash: string;
    mimeType: string;
    extension: string;
    size: number;
    name: string;
    summary?: string | null | undefined;
    createdAt: Date;
    lastProcessedAt?: Date | null | undefined;
    numberOfPages?: number | null | undefined;
    processingStatus: string;
    uploadedById: string;
    uploadedByType: string;
    tokensProcessingMainContent?: number | null | undefined;
    tokensProcessingSummary?: number | null | undefined;
    tokensProcessingTotal: number;
};
/** @internal */
export declare const DocumentOut$inboundSchema: z.ZodType<DocumentOut, z.ZodTypeDef, unknown>;
/** @internal */
export type DocumentOut$Outbound = {
    id: string;
    library_id: string;
    hash: string;
    mime_type: string;
    extension: string;
    size: number;
    name: string;
    summary?: string | null | undefined;
    created_at: string;
    last_processed_at?: string | null | undefined;
    number_of_pages?: number | null | undefined;
    processing_status: string;
    uploaded_by_id: string;
    uploaded_by_type: string;
    tokens_processing_main_content?: number | null | undefined;
    tokens_processing_summary?: number | null | undefined;
    tokens_processing_total: number;
};
/** @internal */
export declare const DocumentOut$outboundSchema: z.ZodType<DocumentOut$Outbound, z.ZodTypeDef, DocumentOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DocumentOut$ {
    /** @deprecated use `DocumentOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<DocumentOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `DocumentOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<DocumentOut$Outbound, z.ZodTypeDef, DocumentOut>;
    /** @deprecated use `DocumentOut$Outbound` instead. */
    type Outbound = DocumentOut$Outbound;
}
export declare function documentOutToJSON(documentOut: DocumentOut): string;
export declare function documentOutFromJSON(jsonString: string): SafeParseResult<DocumentOut, SDKValidationError>;
//# sourceMappingURL=documentout.d.ts.map