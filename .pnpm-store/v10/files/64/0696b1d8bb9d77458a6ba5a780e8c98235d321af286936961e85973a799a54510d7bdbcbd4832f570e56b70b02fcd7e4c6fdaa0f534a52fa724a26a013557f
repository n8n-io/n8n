import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ReferenceChunk, ReferenceChunk$Outbound } from "./referencechunk.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
import { ToolReferenceChunk, ToolReferenceChunk$Outbound } from "./toolreferencechunk.js";
export type Thinking = ToolReferenceChunk | TextChunk | ReferenceChunk;
export type ThinkChunk = {
    type?: "thinking" | undefined;
    thinking: Array<ToolReferenceChunk | TextChunk | ReferenceChunk>;
    /**
     * Whether the thinking chunk is closed or not. Currently only used for prefixing.
     */
    closed?: boolean | undefined;
};
/** @internal */
export declare const Thinking$inboundSchema: z.ZodType<Thinking, z.ZodTypeDef, unknown>;
/** @internal */
export type Thinking$Outbound = ToolReferenceChunk$Outbound | TextChunk$Outbound | ReferenceChunk$Outbound;
/** @internal */
export declare const Thinking$outboundSchema: z.ZodType<Thinking$Outbound, z.ZodTypeDef, Thinking>;
export declare function thinkingToJSON(thinking: Thinking): string;
export declare function thinkingFromJSON(jsonString: string): SafeParseResult<Thinking, SDKValidationError>;
/** @internal */
export declare const ThinkChunk$inboundSchema: z.ZodType<ThinkChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ThinkChunk$Outbound = {
    type: "thinking";
    thinking: Array<ToolReferenceChunk$Outbound | TextChunk$Outbound | ReferenceChunk$Outbound>;
    closed?: boolean | undefined;
};
/** @internal */
export declare const ThinkChunk$outboundSchema: z.ZodType<ThinkChunk$Outbound, z.ZodTypeDef, ThinkChunk>;
export declare function thinkChunkToJSON(thinkChunk: ThinkChunk): string;
export declare function thinkChunkFromJSON(jsonString: string): SafeParseResult<ThinkChunk, SDKValidationError>;
//# sourceMappingURL=thinkchunk.d.ts.map