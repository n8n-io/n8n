import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesDocumentsUpdateV1Request = {
    libraryId: string;
    documentId: string;
    documentUpdateIn: components.DocumentUpdateIn;
};
/** @internal */
export declare const LibrariesDocumentsUpdateV1Request$inboundSchema: z.ZodType<LibrariesDocumentsUpdateV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesDocumentsUpdateV1Request$Outbound = {
    library_id: string;
    document_id: string;
    DocumentUpdateIn: components.DocumentUpdateIn$Outbound;
};
/** @internal */
export declare const LibrariesDocumentsUpdateV1Request$outboundSchema: z.ZodType<LibrariesDocumentsUpdateV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsUpdateV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesDocumentsUpdateV1Request$ {
    /** @deprecated use `LibrariesDocumentsUpdateV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesDocumentsUpdateV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesDocumentsUpdateV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesDocumentsUpdateV1Request$Outbound, z.ZodTypeDef, LibrariesDocumentsUpdateV1Request>;
    /** @deprecated use `LibrariesDocumentsUpdateV1Request$Outbound` instead. */
    type Outbound = LibrariesDocumentsUpdateV1Request$Outbound;
}
export declare function librariesDocumentsUpdateV1RequestToJSON(librariesDocumentsUpdateV1Request: LibrariesDocumentsUpdateV1Request): string;
export declare function librariesDocumentsUpdateV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesDocumentsUpdateV1Request, SDKValidationError>;
//# sourceMappingURL=librariesdocumentsupdatev1.d.ts.map