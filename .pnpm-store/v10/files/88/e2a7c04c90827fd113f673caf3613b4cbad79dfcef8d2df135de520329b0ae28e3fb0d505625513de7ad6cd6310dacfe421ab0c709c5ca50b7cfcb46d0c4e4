import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibrariesUpdateV1Request = {
    libraryId: string;
    libraryInUpdate: components.LibraryInUpdate;
};
/** @internal */
export declare const LibrariesUpdateV1Request$inboundSchema: z.ZodType<LibrariesUpdateV1Request, z.ZodTypeDef, unknown>;
/** @internal */
export type LibrariesUpdateV1Request$Outbound = {
    library_id: string;
    LibraryInUpdate: components.LibraryInUpdate$Outbound;
};
/** @internal */
export declare const LibrariesUpdateV1Request$outboundSchema: z.ZodType<LibrariesUpdateV1Request$Outbound, z.ZodTypeDef, LibrariesUpdateV1Request>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibrariesUpdateV1Request$ {
    /** @deprecated use `LibrariesUpdateV1Request$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibrariesUpdateV1Request, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibrariesUpdateV1Request$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibrariesUpdateV1Request$Outbound, z.ZodTypeDef, LibrariesUpdateV1Request>;
    /** @deprecated use `LibrariesUpdateV1Request$Outbound` instead. */
    type Outbound = LibrariesUpdateV1Request$Outbound;
}
export declare function librariesUpdateV1RequestToJSON(librariesUpdateV1Request: LibrariesUpdateV1Request): string;
export declare function librariesUpdateV1RequestFromJSON(jsonString: string): SafeParseResult<LibrariesUpdateV1Request, SDKValidationError>;
//# sourceMappingURL=librariesupdatev1.d.ts.map