import * as z from "zod/v3";
import * as components from "../components/index.js";
export type FilesApiRoutesListFilesRequest = {
    page?: number | undefined;
    pageSize?: number | undefined;
    includeTotal?: boolean | undefined;
    sampleType?: Array<components.SampleType> | null | undefined;
    source?: Array<components.Source> | null | undefined;
    search?: string | null | undefined;
    purpose?: components.FilePurpose | null | undefined;
    mimetypes?: Array<string> | null | undefined;
};
/** @internal */
export type FilesApiRoutesListFilesRequest$Outbound = {
    page: number;
    page_size: number;
    include_total: boolean;
    sample_type?: Array<string> | null | undefined;
    source?: Array<string> | null | undefined;
    search?: string | null | undefined;
    purpose?: string | null | undefined;
    mimetypes?: Array<string> | null | undefined;
};
/** @internal */
export declare const FilesApiRoutesListFilesRequest$outboundSchema: z.ZodType<FilesApiRoutesListFilesRequest$Outbound, z.ZodTypeDef, FilesApiRoutesListFilesRequest>;
export declare function filesApiRoutesListFilesRequestToJSON(filesApiRoutesListFilesRequest: FilesApiRoutesListFilesRequest): string;
//# sourceMappingURL=filesapirouteslistfiles.d.ts.map