import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilePurpose } from "./filepurpose.js";
import { FileVisibility } from "./filevisibility.js";
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
    expiresAt?: number | null | undefined;
    visibility?: FileVisibility | null | undefined;
};
/** @internal */
export declare const UploadFileOut$inboundSchema: z.ZodType<UploadFileOut, z.ZodTypeDef, unknown>;
export declare function uploadFileOutFromJSON(jsonString: string): SafeParseResult<UploadFileOut, SDKValidationError>;
//# sourceMappingURL=uploadfileout.d.ts.map