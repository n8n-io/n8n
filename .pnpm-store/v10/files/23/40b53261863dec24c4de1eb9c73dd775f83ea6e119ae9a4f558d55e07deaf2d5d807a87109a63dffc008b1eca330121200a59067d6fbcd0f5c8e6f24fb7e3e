import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { DocumentURLChunk, DocumentURLChunk$Outbound } from "./documenturlchunk.js";
import { FileChunk, FileChunk$Outbound } from "./filechunk.js";
import { ImageURLChunk, ImageURLChunk$Outbound } from "./imageurlchunk.js";
import { ResponseFormat, ResponseFormat$Outbound } from "./responseformat.js";
/**
 * Document to run OCR on
 */
export type Document = FileChunk | DocumentURLChunk | ImageURLChunk;
export declare const TableFormat: {
    readonly Markdown: "markdown";
    readonly Html: "html";
};
export type TableFormat = ClosedEnum<typeof TableFormat>;
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
    /**
     * Optional prompt to guide the model in extracting structured output from the entire document. A document_annotation_format must be provided.
     */
    documentAnnotationPrompt?: string | null | undefined;
    tableFormat?: TableFormat | null | undefined;
    extractHeader?: boolean | undefined;
    extractFooter?: boolean | undefined;
};
/** @internal */
export type Document$Outbound = FileChunk$Outbound | DocumentURLChunk$Outbound | ImageURLChunk$Outbound;
/** @internal */
export declare const Document$outboundSchema: z.ZodType<Document$Outbound, z.ZodTypeDef, Document>;
export declare function documentToJSON(document: Document): string;
/** @internal */
export declare const TableFormat$outboundSchema: z.ZodNativeEnum<typeof TableFormat>;
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
    document_annotation_prompt?: string | null | undefined;
    table_format?: string | null | undefined;
    extract_header?: boolean | undefined;
    extract_footer?: boolean | undefined;
};
/** @internal */
export declare const OCRRequest$outboundSchema: z.ZodType<OCRRequest$Outbound, z.ZodTypeDef, OCRRequest>;
export declare function ocrRequestToJSON(ocrRequest: OCRRequest): string;
//# sourceMappingURL=ocrrequest.d.ts.map