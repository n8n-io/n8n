import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentURLChunk, DocumentURLChunk$Outbound } from "./documenturlchunk.js";
import { ImageURLChunk, ImageURLChunk$Outbound } from "./imageurlchunk.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
import { ThinkChunk, ThinkChunk$Outbound } from "./thinkchunk.js";
import { ToolFileChunk, ToolFileChunk$Outbound } from "./toolfilechunk.js";
import { ToolReferenceChunk, ToolReferenceChunk$Outbound } from "./toolreferencechunk.js";
export type OutputContentChunks = ToolFileChunk | ToolReferenceChunk | TextChunk | ImageURLChunk | DocumentURLChunk | ThinkChunk;
/** @internal */
export declare const OutputContentChunks$inboundSchema: z.ZodType<OutputContentChunks, z.ZodTypeDef, unknown>;
/** @internal */
export type OutputContentChunks$Outbound = ToolFileChunk$Outbound | ToolReferenceChunk$Outbound | TextChunk$Outbound | ImageURLChunk$Outbound | DocumentURLChunk$Outbound | ThinkChunk$Outbound;
/** @internal */
export declare const OutputContentChunks$outboundSchema: z.ZodType<OutputContentChunks$Outbound, z.ZodTypeDef, OutputContentChunks>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace OutputContentChunks$ {
    /** @deprecated use `OutputContentChunks$inboundSchema` instead. */
    const inboundSchema: z.ZodType<OutputContentChunks, z.ZodTypeDef, unknown>;
    /** @deprecated use `OutputContentChunks$outboundSchema` instead. */
    const outboundSchema: z.ZodType<OutputContentChunks$Outbound, z.ZodTypeDef, OutputContentChunks>;
    /** @deprecated use `OutputContentChunks$Outbound` instead. */
    type Outbound = OutputContentChunks$Outbound;
}
export declare function outputContentChunksToJSON(outputContentChunks: OutputContentChunks): string;
export declare function outputContentChunksFromJSON(jsonString: string): SafeParseResult<OutputContentChunks, SDKValidationError>;
//# sourceMappingURL=outputcontentchunks.d.ts.map