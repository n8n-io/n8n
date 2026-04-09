import * as z from "zod/v3";
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
export declare function fileChunkToJSON(fileChunk: FileChunk): string;
export declare function fileChunkFromJSON(jsonString: string): SafeParseResult<FileChunk, SDKValidationError>;
//# sourceMappingURL=filechunk.d.ts.map