import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import * as components from "../components/index.js";
export declare const FileVisibility: {
    readonly Workspace: "workspace";
    readonly User: "user";
};
export type FileVisibility = ClosedEnum<typeof FileVisibility>;
export type FilesApiRoutesUploadFileMultiPartBodyParams = {
    expiry?: number | null | undefined;
    visibility?: FileVisibility | undefined;
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
export declare const FileVisibility$outboundSchema: z.ZodNativeEnum<typeof FileVisibility>;
/** @internal */
export type FilesApiRoutesUploadFileMultiPartBodyParams$Outbound = {
    expiry?: number | null | undefined;
    visibility: string;
    purpose?: string | undefined;
    file: components.FileT$Outbound | Blob;
};
/** @internal */
export declare const FilesApiRoutesUploadFileMultiPartBodyParams$outboundSchema: z.ZodType<FilesApiRoutesUploadFileMultiPartBodyParams$Outbound, z.ZodTypeDef, FilesApiRoutesUploadFileMultiPartBodyParams>;
export declare function filesApiRoutesUploadFileMultiPartBodyParamsToJSON(filesApiRoutesUploadFileMultiPartBodyParams: FilesApiRoutesUploadFileMultiPartBodyParams): string;
//# sourceMappingURL=filesapiroutesuploadfile.d.ts.map