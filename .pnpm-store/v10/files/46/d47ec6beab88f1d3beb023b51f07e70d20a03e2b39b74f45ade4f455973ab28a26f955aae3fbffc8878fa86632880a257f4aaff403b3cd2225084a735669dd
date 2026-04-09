import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ToolConfiguration, ToolConfiguration$Outbound } from "./toolconfiguration.js";
export declare const DocumentLibraryToolType: {
    readonly DocumentLibrary: "document_library";
};
export type DocumentLibraryToolType = ClosedEnum<typeof DocumentLibraryToolType>;
export type DocumentLibraryTool = {
    toolConfiguration?: ToolConfiguration | null | undefined;
    type?: DocumentLibraryToolType | undefined;
    /**
     * Ids of the library in which to search.
     */
    libraryIds: Array<string>;
};
/** @internal */
export declare const DocumentLibraryToolType$inboundSchema: z.ZodNativeEnum<typeof DocumentLibraryToolType>;
/** @internal */
export declare const DocumentLibraryToolType$outboundSchema: z.ZodNativeEnum<typeof DocumentLibraryToolType>;
/** @internal */
export declare const DocumentLibraryTool$inboundSchema: z.ZodType<DocumentLibraryTool, z.ZodTypeDef, unknown>;
/** @internal */
export type DocumentLibraryTool$Outbound = {
    tool_configuration?: ToolConfiguration$Outbound | null | undefined;
    type: string;
    library_ids: Array<string>;
};
/** @internal */
export declare const DocumentLibraryTool$outboundSchema: z.ZodType<DocumentLibraryTool$Outbound, z.ZodTypeDef, DocumentLibraryTool>;
export declare function documentLibraryToolToJSON(documentLibraryTool: DocumentLibraryTool): string;
export declare function documentLibraryToolFromJSON(jsonString: string): SafeParseResult<DocumentLibraryTool, SDKValidationError>;
//# sourceMappingURL=documentlibrarytool.d.ts.map