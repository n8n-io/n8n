import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilePurpose } from "./filepurpose.js";
import { SampleType } from "./sampletype.js";
import { Source } from "./source.js";
export type FileSchema = {
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
export declare const FileSchema$inboundSchema: z.ZodType<FileSchema, z.ZodTypeDef, unknown>;
/** @internal */
export type FileSchema$Outbound = {
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
export declare const FileSchema$outboundSchema: z.ZodType<FileSchema$Outbound, z.ZodTypeDef, FileSchema>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FileSchema$ {
    /** @deprecated use `FileSchema$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FileSchema, z.ZodTypeDef, unknown>;
    /** @deprecated use `FileSchema$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FileSchema$Outbound, z.ZodTypeDef, FileSchema>;
    /** @deprecated use `FileSchema$Outbound` instead. */
    type Outbound = FileSchema$Outbound;
}
export declare function fileSchemaToJSON(fileSchema: FileSchema): string;
export declare function fileSchemaFromJSON(jsonString: string): SafeParseResult<FileSchema, SDKValidationError>;
//# sourceMappingURL=fileschema.d.ts.map