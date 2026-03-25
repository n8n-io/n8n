import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibraryInUpdate = {
    name?: string | null | undefined;
    description?: string | null | undefined;
};
/** @internal */
export declare const LibraryInUpdate$inboundSchema: z.ZodType<LibraryInUpdate, z.ZodTypeDef, unknown>;
/** @internal */
export type LibraryInUpdate$Outbound = {
    name?: string | null | undefined;
    description?: string | null | undefined;
};
/** @internal */
export declare const LibraryInUpdate$outboundSchema: z.ZodType<LibraryInUpdate$Outbound, z.ZodTypeDef, LibraryInUpdate>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibraryInUpdate$ {
    /** @deprecated use `LibraryInUpdate$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibraryInUpdate, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibraryInUpdate$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibraryInUpdate$Outbound, z.ZodTypeDef, LibraryInUpdate>;
    /** @deprecated use `LibraryInUpdate$Outbound` instead. */
    type Outbound = LibraryInUpdate$Outbound;
}
export declare function libraryInUpdateToJSON(libraryInUpdate: LibraryInUpdate): string;
export declare function libraryInUpdateFromJSON(jsonString: string): SafeParseResult<LibraryInUpdate, SDKValidationError>;
//# sourceMappingURL=libraryinupdate.d.ts.map