import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type TextChunk = {
    type?: "text" | undefined;
    text: string;
};
/** @internal */
export declare const TextChunk$inboundSchema: z.ZodType<TextChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type TextChunk$Outbound = {
    type: "text";
    text: string;
};
/** @internal */
export declare const TextChunk$outboundSchema: z.ZodType<TextChunk$Outbound, z.ZodTypeDef, TextChunk>;
export declare function textChunkToJSON(textChunk: TextChunk): string;
export declare function textChunkFromJSON(jsonString: string): SafeParseResult<TextChunk, SDKValidationError>;
//# sourceMappingURL=textchunk.d.ts.map