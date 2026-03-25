import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilePurpose } from "./filepurpose.js";
import { SampleType } from "./sampletype.js";
import { Source } from "./source.js";
export type UploadFileOut = {
    /**
     * The unique identifier of the file.
     */
    id: string;
    /**
     * The object type, which is always "file".
     */
    object: string;
    /**
     * The size of the file, in bytes.
     */
    sizeBytes: number;
    /**
     * The UNIX timestamp (in seconds) of the event.
     */
    createdAt: number;
    /**
     * The name of the uploaded file.
     */
    filename: string;
    purpose: FilePurpose;
    sampleType: SampleType;
    numLines?: number | null | undefined;
    mimetype?: string | null | undefined;
    source: Source;
    signature?: string | null | undefined;
};
/** @internal */
export declare const UploadFileOut$inboundSchema: z.ZodType<UploadFileOut, z.ZodTypeDef, unknown>;
/** @internal */
export type UploadFileOut$Outbound = {
    id: string;
    object: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
    sample_type: string;
    num_lines?: number | null | undefined;
    mimetype?: string | null | undefined;
    source: string;
    signature?: string | null | undefined;
};
/** @internal */
export declare const UploadFileOut$outboundSchema: z.ZodType<UploadFileOut$Outbound, z.ZodTypeDef, UploadFileOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UploadFileOut$ {
    /** @deprecated use `UploadFileOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<UploadFileOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `UploadFileOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<UploadFileOut$Outbound, z.ZodTypeDef, UploadFileOut>;
    /** @deprecated use `UploadFileOut$Outbound` instead. */
    type Outbound = UploadFileOut$Outbound;
}
export declare function uploadFileOutToJSON(uploadFileOut: UploadFileOut): string;
export declare function uploadFileOutFromJSON(jsonString: string): SafeParseResult<UploadFileOut, SDKValidationError>;
//# sourceMappingURL=uploadfileout.d.ts.map