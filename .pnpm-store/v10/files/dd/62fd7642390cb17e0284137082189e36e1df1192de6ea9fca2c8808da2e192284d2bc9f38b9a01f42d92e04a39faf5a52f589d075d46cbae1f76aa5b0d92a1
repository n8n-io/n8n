import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FileT = {
    fileName: string;
    content: ReadableStream<Uint8Array> | Blob | ArrayBuffer | Uint8Array;
};
/** @internal */
export declare const FileT$inboundSchema: z.ZodType<FileT, z.ZodTypeDef, unknown>;
/** @internal */
export type FileT$Outbound = {
    fileName: string;
    content: ReadableStream<Uint8Array> | Blob | ArrayBuffer | Uint8Array;
};
/** @internal */
export declare const FileT$outboundSchema: z.ZodType<FileT$Outbound, z.ZodTypeDef, FileT>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FileT$ {
    /** @deprecated use `FileT$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FileT, z.ZodTypeDef, unknown>;
    /** @deprecated use `FileT$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FileT$Outbound, z.ZodTypeDef, FileT>;
    /** @deprecated use `FileT$Outbound` instead. */
    type Outbound = FileT$Outbound;
}
export declare function fileToJSON(fileT: FileT): string;
export declare function fileFromJSON(jsonString: string): SafeParseResult<FileT, SDKValidationError>;
//# sourceMappingURL=file.d.ts.map