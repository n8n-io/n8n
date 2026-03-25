import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FilesApiRoutesListFilesRequest = {
    page?: number | undefined;
    pageSize?: number | undefined;
    sampleType?: Array<components.SampleType> | null | undefined;
    source?: Array<components.Source> | null | undefined;
    search?: string | null | undefined;
    purpose?: components.FilePurpose | null | undefined;
};
/** @internal */
export declare const FilesApiRoutesListFilesRequest$inboundSchema: z.ZodType<FilesApiRoutesListFilesRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type FilesApiRoutesListFilesRequest$Outbound = {
    page: number;
    page_size: number;
    sample_type?: Array<string> | null | undefined;
    source?: Array<string> | null | undefined;
    search?: string | null | undefined;
    purpose?: string | null | undefined;
};
/** @internal */
export declare const FilesApiRoutesListFilesRequest$outboundSchema: z.ZodType<FilesApiRoutesListFilesRequest$Outbound, z.ZodTypeDef, FilesApiRoutesListFilesRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FilesApiRoutesListFilesRequest$ {
    /** @deprecated use `FilesApiRoutesListFilesRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FilesApiRoutesListFilesRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `FilesApiRoutesListFilesRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FilesApiRoutesListFilesRequest$Outbound, z.ZodTypeDef, FilesApiRoutesListFilesRequest>;
    /** @deprecated use `FilesApiRoutesListFilesRequest$Outbound` instead. */
    type Outbound = FilesApiRoutesListFilesRequest$Outbound;
}
export declare function filesApiRoutesListFilesRequestToJSON(filesApiRoutesListFilesRequest: FilesApiRoutesListFilesRequest): string;
export declare function filesApiRoutesListFilesRequestFromJSON(jsonString: string): SafeParseResult<FilesApiRoutesListFilesRequest, SDKValidationError>;
//# sourceMappingURL=filesapirouteslistfiles.d.ts.map