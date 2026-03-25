import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentURLChunk, DocumentURLChunk$Outbound } from "./documenturlchunk.js";
import { FileChunk, FileChunk$Outbound } from "./filechunk.js";
import { ImageURLChunk, ImageURLChunk$Outbound } from "./imageurlchunk.js";
import { ResponseFormat, ResponseFormat$Outbound } from "./responseformat.js";
/**
 * Document to run OCR on
 */
export type Document = FileChunk | DocumentURLChunk | ImageURLChunk;
export type OCRRequest = {
    model: string | null;
    id?: string | undefined;
    /**
     * Document to run OCR on
     */
    document: FileChunk | DocumentURLChunk | ImageURLChunk;
    /**
     * Specific pages user wants to process in various formats: single number, range, or list of both. Starts from 0
     */
    pages?: Array<number> | null | undefined;
    /**
     * Include image URLs in response
     */
    includeImageBase64?: boolean | null | undefined;
    /**
     * Max images to extract
     */
    imageLimit?: number | null | undefined;
    /**
     * Minimum height and width of image to extract
     */
    imageMinSize?: number | null | undefined;
    /**
     * Structured output class for extracting useful information from each extracted bounding box / image from document. Only json_schema is valid for this field
     */
    bboxAnnotationFormat?: ResponseFormat | null | undefined;
    /**
     * Structured output class for extracting useful information from the entire document. Only json_schema is valid for this field
     */
    documentAnnotationFormat?: ResponseFormat | null | undefined;
};
/** @internal */
export declare const Document$inboundSchema: z.ZodType<Document, z.ZodTypeDef, unknown>;
/** @internal */
export type Document$Outbound = FileChunk$Outbound | DocumentURLChunk$Outbound | ImageURLChunk$Outbound;
/** @internal */
export declare const Document$outboundSchema: z.ZodType<Document$Outbound, z.ZodTypeDef, Document>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Document$ {
    /** @deprecated use `Document$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Document, z.ZodTypeDef, unknown>;
    /** @deprecated use `Document$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Document$Outbound, z.ZodTypeDef, Document>;
    /** @deprecated use `Document$Outbound` instead. */
    type Outbound = Document$Outbound;
}
export declare function documentToJSON(document: Document): string;
export declare function documentFromJSON(jsonString: string): SafeParseResult<Document, SDKValidationError>;
/** @internal */
export declare const OCRRequest$inboundSchema: z.ZodType<OCRRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type OCRRequest$Outbound = {
    model: string | null;
    id?: string | undefined;
    document: FileChunk$Outbound | DocumentURLChunk$Outbound | ImageURLChunk$Outbound;
    pages?: Array<number> | null | undefined;
    include_image_base64?: boolean | null | undefined;
    image_limit?: number | null | undefined;
    image_min_size?: number | null | undefined;
    bbox_annotation_format?: ResponseFormat$Outbound | null | undefined;
    document_annotation_format?: ResponseFormat$Outbound | null | undefined;
};
/** @internal */
export declare const OCRRequest$outboundSchema: z.ZodType<OCRRequest$Outbound, z.ZodTypeDef, OCRRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OCRRequest$ {
    /** @deprecated use `OCRRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OCRRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `OCRRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OCRRequest$Outbound, z.ZodTypeDef, OCRRequest>;
    /** @deprecated use `OCRRequest$Outbound` instead. */
    type Outbound = OCRRequest$Outbound;
}
export declare function ocrRequestToJSON(ocrRequest: OCRRequest): string;
export declare function ocrRequestFromJSON(jsonString: string): SafeParseResult<OCRRequest, SDKValidationError>;
//# sourceMappingURL=ocrrequest.d.ts.map