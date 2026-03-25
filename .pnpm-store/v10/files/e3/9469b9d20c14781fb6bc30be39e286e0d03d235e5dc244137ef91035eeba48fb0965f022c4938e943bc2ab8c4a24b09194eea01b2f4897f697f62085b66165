import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FilesApiRoutesGetSignedUrlRequest = {
    fileId: string;
    /**
     * Number of hours before the url becomes invalid. Defaults to 24h
     */
    expiry?: number | undefined;
};
/** @internal */
export declare const FilesApiRoutesGetSignedUrlRequest$inboundSchema: z.ZodType<FilesApiRoutesGetSignedUrlRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type FilesApiRoutesGetSignedUrlRequest$Outbound = {
    file_id: string;
    expiry: number;
};
/** @internal */
export declare const FilesApiRoutesGetSignedUrlRequest$outboundSchema: z.ZodType<FilesApiRoutesGetSignedUrlRequest$Outbound, z.ZodTypeDef, FilesApiRoutesGetSignedUrlRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FilesApiRoutesGetSignedUrlRequest$ {
    /** @deprecated use `FilesApiRoutesGetSignedUrlRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FilesApiRoutesGetSignedUrlRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `FilesApiRoutesGetSignedUrlRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FilesApiRoutesGetSignedUrlRequest$Outbound, z.ZodTypeDef, FilesApiRoutesGetSignedUrlRequest>;
    /** @deprecated use `FilesApiRoutesGetSignedUrlRequest$Outbound` instead. */
    type Outbound = FilesApiRoutesGetSignedUrlRequest$Outbound;
}
export declare function filesApiRoutesGetSignedUrlRequestToJSON(filesApiRoutesGetSignedUrlRequest: FilesApiRoutesGetSignedUrlRequest): string;
export declare function filesApiRoutesGetSignedUrlRequestFromJSON(jsonString: string): SafeParseResult<FilesApiRoutesGetSignedUrlRequest, SDKValidationError>;
//# sourceMappingURL=filesapiroutesgetsignedurl.d.ts.map