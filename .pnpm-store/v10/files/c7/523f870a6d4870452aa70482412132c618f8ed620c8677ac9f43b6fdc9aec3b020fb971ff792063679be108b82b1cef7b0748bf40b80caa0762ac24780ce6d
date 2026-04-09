import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ReferenceChunk = {
    type?: "reference" | undefined;
    referenceIds: Array<number>;
};
/** @internal */
export declare const ReferenceChunk$inboundSchema: z.ZodType<ReferenceChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ReferenceChunk$Outbound = {
    type: "reference";
    reference_ids: Array<number>;
};
/** @internal */
export declare const ReferenceChunk$outboundSchema: z.ZodType<ReferenceChunk$Outbound, z.ZodTypeDef, ReferenceChunk>;
export declare function referenceChunkToJSON(referenceChunk: ReferenceChunk): string;
export declare function referenceChunkFromJSON(jsonString: string): SafeParseResult<ReferenceChunk, SDKValidationError>;
//# sourceMappingURL=referencechunk.d.ts.map