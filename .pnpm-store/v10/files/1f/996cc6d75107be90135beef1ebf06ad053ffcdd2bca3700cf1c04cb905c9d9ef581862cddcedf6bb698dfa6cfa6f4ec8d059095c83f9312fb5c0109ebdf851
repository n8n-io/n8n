import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilePurpose } from "./filepurpose.js";
import { SampleType } from "./sampletype.js";
import { Source } from "./source.js";
export type RetrieveFileOut = {
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
    deleted: boolean;
};
/** @internal */
export declare const RetrieveFileOut$inboundSchema: z.ZodType<RetrieveFileOut, z.ZodTypeDef, unknown>;
/** @internal */
export type RetrieveFileOut$Outbound = {
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
    deleted: boolean;
};
/** @internal */
export declare const RetrieveFileOut$outboundSchema: z.ZodType<RetrieveFileOut$Outbound, z.ZodTypeDef, RetrieveFileOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace RetrieveFileOut$ {
    /** @deprecated use `RetrieveFileOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<RetrieveFileOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `RetrieveFileOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<RetrieveFileOut$Outbound, z.ZodTypeDef, RetrieveFileOut>;
    /** @deprecated use `RetrieveFileOut$Outbound` instead. */
    type Outbound = RetrieveFileOut$Outbound;
}
export declare function retrieveFileOutToJSON(retrieveFileOut: RetrieveFileOut): string;
export declare function retrieveFileOutFromJSON(jsonString: string): SafeParseResult<RetrieveFileOut, SDKValidationError>;
//# sourceMappingURL=retrievefileout.d.ts.map