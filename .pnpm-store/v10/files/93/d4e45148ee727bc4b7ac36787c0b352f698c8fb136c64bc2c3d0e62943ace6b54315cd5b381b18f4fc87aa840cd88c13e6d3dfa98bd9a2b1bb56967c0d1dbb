import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type DocumentURLChunk = {
    type?: "document_url" | undefined;
    documentUrl: string;
    /**
     * The filename of the document
     */
    documentName?: string | null | undefined;
};
/** @internal */
export declare const DocumentURLChunk$inboundSchema: z.ZodType<DocumentURLChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type DocumentURLChunk$Outbound = {
    type: "document_url";
    document_url: string;
    document_name?: string | null | undefined;
};
/** @internal */
export declare const DocumentURLChunk$outboundSchema: z.ZodType<DocumentURLChunk$Outbound, z.ZodTypeDef, DocumentURLChunk>;
export declare function documentURLChunkToJSON(documentURLChunk: DocumentURLChunk): string;
export declare function documentURLChunkFromJSON(jsonString: string): SafeParseResult<DocumentURLChunk, SDKValidationError>;
//# sourceMappingURL=documenturlchunk.d.ts.map