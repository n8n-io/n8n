import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FileSignedURL = {
    url: string;
};
/** @internal */
export declare const FileSignedURL$inboundSchema: z.ZodType<FileSignedURL, z.ZodTypeDef, unknown>;
/** @internal */
export type FileSignedURL$Outbound = {
    url: string;
};
/** @internal */
export declare const FileSignedURL$outboundSchema: z.ZodType<FileSignedURL$Outbound, z.ZodTypeDef, FileSignedURL>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FileSignedURL$ {
    /** @deprecated use `FileSignedURL$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FileSignedURL, z.ZodTypeDef, unknown>;
    /** @deprecated use `FileSignedURL$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FileSignedURL$Outbound, z.ZodTypeDef, FileSignedURL>;
    /** @deprecated use `FileSignedURL$Outbound` instead. */
    type Outbound = FileSignedURL$Outbound;
}
export declare function fileSignedURLToJSON(fileSignedURL: FileSignedURL): string;
export declare function fileSignedURLFromJSON(jsonString: string): SafeParseResult<FileSignedURL, SDKValidationError>;
//# sourceMappingURL=filesignedurl.d.ts.map