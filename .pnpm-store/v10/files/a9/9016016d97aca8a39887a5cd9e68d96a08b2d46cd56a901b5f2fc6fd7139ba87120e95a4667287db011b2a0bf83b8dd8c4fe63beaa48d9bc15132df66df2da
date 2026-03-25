import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesDocumentsUploadV1DocumentUpload = {
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
export type LibrariesDocumentsUploadV1Request = {
    libraryId: string;
    requestBody: LibrariesDocumentsUploadV1DocumentUpload;
};
/** @internal */
export declare const LibrariesDocumentsUploadV1DocumentUpload$inboundSchema: z.ZodType<LibrariesDocumentsUploadV1DocumentUpload, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesDocumentsUploadV1DocumentUpload$Outbound = {
    file: components.FileT$Outbound | Blob;
};
/** @internal */
export declare const LibrariesDocumentsUploadV1DocumentUpload$outboundSchema: z.ZodType<LibrariesDocumentsUploadV1DocumentUpload$Outbound, z.ZodTypeDef, LibrariesDocumentsUploadV1DocumentUpload>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesDocumentsUploadV1DocumentUpload$ {
    /** @deprecated use `LibrariesDocumentsUploadV1DocumentUpload$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesDocumentsUploadV1DocumentUpload, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesDocumentsUploadV1DocumentUpload$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesDocumentsUploadV1DocumentUpload$Outbound, z.ZodTypeDef, LibrariesDocumentsUploadV1DocumentUpload>;
    /** @deprecated use `LibrariesDocumentsUploadV1DocumentUpload$Outbound` instead. */
    type Outbound = LibrariesDocumentsUploadV1DocumentUpload$Outbound;
}
export declare function librariesDocumentsUploadV1DocumentUploadToJSON(librariesDocumentsUploadV1DocumentUpload: LibrariesDocumentsUploadV1DocumentUpload): string;
export declare function librariesDocumentsUploadV1DocumentUploadFromJSON(jsonString: string): SafeParseResult<LibrariesDocumentsUploadV1DocumentUpload, SDKValidationError>;
/** @internal */
export declare const LibrariesDocumentsUploadV1Request$inboundSchema: z.ZodType<LibrariesDocumentsUploadV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesDocumentsUploadV1Request$Outbound = {
    library_id: string;
    RequestBody: LibrariesDocumentsUploadV1DocumentUpload$Outbound;
};
/** @internal */
export declare const LibrariesDocumentsUploadV1Request$outboundSchema: z.ZodType<LibrariesDocumentsUploadV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsUploadV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesDocumentsUploadV1Request$ {
    /** @deprecated use `LibrariesDocumentsUploadV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesDocumentsUploadV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesDocumentsUploadV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesDocumentsUploadV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsUploadV1Request>;
    /** @deprecated use `LibrariesDocumentsUploadV1Request$Outbound` instead. */
    type Outbound = LibrariesDocumentsUploadV1Request$Outbound;
}
export declare function librariesDocumentsUploadV1RequestToJSON(librariesDocumentsUploadV1Request: LibrariesDocumentsUploadV1Request): string;
export declare function librariesDocumentsUploadV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesDocumentsUploadV1Request, SDKValidationError>;
//# sourceMappingURL=librariesdocumentsuploadv1.d.ts.map