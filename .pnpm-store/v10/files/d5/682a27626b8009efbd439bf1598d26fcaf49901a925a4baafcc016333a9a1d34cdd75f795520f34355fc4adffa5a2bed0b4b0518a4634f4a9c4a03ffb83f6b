import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesShareDeleteV1Request = {
    libraryId: string;
    sharingDelete: components.SharingDelete;
};
/** @internal */
export declare const LibrariesShareDeleteV1Request$inboundSchema: z.ZodType<LibrariesShareDeleteV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesShareDeleteV1Request$Outbound = {
    library_id: string;
    SharingDelete: components.SharingDelete$Outbound;
};
/** @internal */
export declare const LibrariesShareDeleteV1Request$outboundSchema: z.ZodType<LibrariesShareDeleteV1Request$Outbound, z.ZodTypeDef, LibrariesShareDeleteV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesShareDeleteV1Request$ {
    /** @deprecated use `LibrariesShareDeleteV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesShareDeleteV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesShareDeleteV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesShareDeleteV1Request$Outbound, z.ZodTypeDef, LibrariesShareDeleteV1Request>;
    /** @deprecated use `LibrariesShareDeleteV1Request$Outbound` instead. */
    type Outbound = LibrariesShareDeleteV1Request$Outbound;
}
export declare function librariesShareDeleteV1RequestToJSON(librariesShareDeleteV1Request: LibrariesShareDeleteV1Request): string;
export declare function librariesShareDeleteV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesShareDeleteV1Request, SDKValidationError>;
//# sourceMappingURL=librariessharedeletev1.d.ts.map