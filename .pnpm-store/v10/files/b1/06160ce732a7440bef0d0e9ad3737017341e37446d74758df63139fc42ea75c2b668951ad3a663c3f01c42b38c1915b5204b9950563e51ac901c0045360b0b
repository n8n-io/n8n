import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FilesApiRoutesUploadFileMultiPartBodyParams = {
    purpose?: components.FilePurpose | undefined;
    /**
     * The File object (not file name) to be uploaded.
     *
     * @remarks
     *  To upload a file and specify a custom file name you should format your request as such:
     *  ```bash
     *  file=@path/to/your/file.jsonl;filename=custom_name.jsonl
     *  ```
     *  Otherwise, you can just keep the original file name:
     *  ```bash
     *  file=@path/to/your/file.jsonl
     *  ```
     */
    file: components.FileT | Blob;
};
/** @internal */
export declare const FilesApiRoutesUploadFileMultiPartBodyParams$inboundSchema: z.ZodType<FilesApiRoutesUploadFileMultiPartBodyParams, z.ZodTypeDef, unknown>;
/** @internal */
export type FilesApiRoutesUploadFileMultiPartBodyParams$Outbound = {
    purpose?: string | undefined;
    file: components.FileT$Outbound | Blob;
};
/** @internal */
export declare const FilesApiRoutesUploadFileMultiPartBodyParams$outboundSchema: z.ZodType<FilesApiRoutesUploadFileMultiPartBodyParams$Outbound, z.ZodTypeDef, FilesApiRoutesUploadFileMultiPartBodyParams>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FilesApiRoutesUploadFileMultiPartBodyParams$ {
    /** @deprecated use `FilesApiRoutesUploadFileMultiPartBodyParams$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FilesApiRoutesUploadFileMultiPartBodyParams, z.ZodTypeDef, unknown>;
    /** @deprecated use `FilesApiRoutesUploadFileMultiPartBodyParams$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FilesApiRoutesUploadFileMultiPartBodyParams$Outbound, z.ZodTypeDef, FilesApiRoutesUploadFileMultiPartBodyParams>;
    /** @deprecated use `FilesApiRoutesUploadFileMultiPartBodyParams$Outbound` instead. */
    type Outbound = FilesApiRoutesUploadFileMultiPartBodyParams$Outbound;
}
export declare function filesApiRoutesUploadFileMultiPartBodyParamsToJSON(filesApiRoutesUploadFileMultiPartBodyParams: FilesApiRoutesUploadFileMultiPartBodyParams): string;
export declare function filesApiRoutesUploadFileMultiPartBodyParamsFromJSON(jsonString: string): SafeParseResult<FilesApiRoutesUploadFileMultiPartBodyParams, SDKValidationError>;
//# sourceMappingURL=filesapiroutesuploadfile.d.ts.map