import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibraryIn = {
    name: string;
    description?: string | null | undefined;
    chunkSize?: number | null | undefined;
};
/** @internal */
export declare const LibraryIn$inboundSchema: z.ZodType<LibraryIn, z.ZodTypeDef, unknown>;
/** @internal */
export type LibraryIn$Outbound = {
    name: string;
    description?: string | null | undefined;
    chunk_size?: number | null | undefined;
};
/** @internal */
export declare const LibraryIn$outboundSchema: z.ZodType<LibraryIn$Outbound, z.ZodTypeDef, LibraryIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibraryIn$ {
    /** @deprecated use `LibraryIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibraryIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibraryIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibraryIn$Outbound, z.ZodTypeDef, LibraryIn>;
    /** @deprecated use `LibraryIn$Outbound` instead. */
    type Outbound = LibraryIn$Outbound;
}
export declare function libraryInToJSON(libraryIn: LibraryIn): string;
export declare function libraryInFromJSON(jsonString: string): SafeParseResult<LibraryIn, SDKValidationError>;
//# sourceMappingURL=libraryin.d.ts.map