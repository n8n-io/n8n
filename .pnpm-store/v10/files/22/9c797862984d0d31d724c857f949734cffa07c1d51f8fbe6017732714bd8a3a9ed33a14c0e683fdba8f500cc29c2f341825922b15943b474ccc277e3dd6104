import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FileChunk = {
    type?: "file" | undefined;
    fileId: string;
};
/** @internal */
export declare const FileChunk$inboundSchema: z.ZodType<FileChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type FileChunk$Outbound = {
    type: "file";
    file_id: string;
};
/** @internal */
export declare const FileChunk$outboundSchema: z.ZodType<FileChunk$Outbound, z.ZodTypeDef, FileChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FileChunk$ {
    /** @deprecated use `FileChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FileChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `FileChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FileChunk$Outbound, z.ZodTypeDef, FileChunk>;
    /** @deprecated use `FileChunk$Outbound` instead. */
    type Outbound = FileChunk$Outbound;
}
export declare function fileChunkToJSON(fileChunk: FileChunk): string;
export declare function fileChunkFromJSON(jsonString: string): SafeParseResult<FileChunk, SDKValidationError>;
//# sourceMappingURL=filechunk.d.ts.map