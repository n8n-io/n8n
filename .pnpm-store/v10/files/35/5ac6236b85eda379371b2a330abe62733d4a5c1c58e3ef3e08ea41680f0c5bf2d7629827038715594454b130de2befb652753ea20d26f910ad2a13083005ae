import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesShareCreateV1Request = {
    libraryId: string;
    sharingIn: components.SharingIn;
};
/** @internal */
export declare const LibrariesShareCreateV1Request$inboundSchema: z.ZodType<LibrariesShareCreateV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesShareCreateV1Request$Outbound = {
    library_id: string;
    SharingIn: components.SharingIn$Outbound;
};
/** @internal */
export declare const LibrariesShareCreateV1Request$outboundSchema: z.ZodType<LibrariesShareCreateV1Request$Outbound, z.ZodTypeDef, LibrariesShareCreateV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesShareCreateV1Request$ {
    /** @deprecated use `LibrariesShareCreateV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesShareCreateV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesShareCreateV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesShareCreateV1Request$Outbound, z.ZodTypeDef, LibrariesShareCreateV1Request>;
    /** @deprecated use `LibrariesShareCreateV1Request$Outbound` instead. */
    type Outbound = LibrariesShareCreateV1Request$Outbound;
}
export declare function librariesShareCreateV1RequestToJSON(librariesShareCreateV1Request: LibrariesShareCreateV1Request): string;
export declare function librariesShareCreateV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesShareCreateV1Request, SDKValidationError>;
//# sourceMappingURL=librariessharecreatev1.d.ts.map