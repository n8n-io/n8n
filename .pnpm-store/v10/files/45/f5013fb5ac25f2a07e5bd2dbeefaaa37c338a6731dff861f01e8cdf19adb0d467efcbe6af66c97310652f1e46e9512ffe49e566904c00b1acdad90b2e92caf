import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ReferenceChunk, ReferenceChunk$Outbound } from "./referencechunk.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
export type Thinking = ReferenceChunk | TextChunk;
export declare const ThinkChunkType: {
    readonly Thinking: "thinking";
};
export type ThinkChunkType = ClosedEnum<typeof ThinkChunkType>;
export type ThinkChunk = {
    thinking: Array<ReferenceChunk | TextChunk>;
    /**
     * Whether the thinking chunk is closed or not. Currently only used for prefixing.
     */
    closed?: boolean | undefined;
    type?: ThinkChunkType | undefined;
};
/** @internal */
export declare const Thinking$inboundSchema: z.ZodType<Thinking, z.ZodTypeDef, unknown>;
/** @internal */
export type Thinking$Outbound = ReferenceChunk$Outbound | TextChunk$Outbound;
/** @internal */
export declare const Thinking$outboundSchema: z.ZodType<Thinking$Outbound, z.ZodTypeDef, Thinking>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Thinking$ {
    /** @deprecated use `Thinking$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Thinking, z.ZodTypeDef, unknown>;
    /** @deprecated use `Thinking$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Thinking$Outbound, z.ZodTypeDef, Thinking>;
    /** @deprecated use `Thinking$Outbound` instead. */
    type Outbound = Thinking$Outbound;
}
export declare function thinkingToJSON(thinking: Thinking): string;
export declare function thinkingFromJSON(jsonString: string): SafeParseResult<Thinking, SDKValidationError>;
/** @internal */
export declare const ThinkChunkType$inboundSchema: z.ZodNativeEnum<typeof ThinkChunkType>;
/** @internal */
export declare const ThinkChunkType$outboundSchema: z.ZodNativeEnum<typeof ThinkChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ThinkChunkType$ {
    /** @deprecated use `ThinkChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Thinking: "thinking";
    }>;
    /** @deprecated use `ThinkChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Thinking: "thinking";
    }>;
}
/** @internal */
export declare const ThinkChunk$inboundSchema: z.ZodType<ThinkChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ThinkChunk$Outbound = {
    thinking: Array<ReferenceChunk$Outbound | TextChunk$Outbound>;
    closed?: boolean | undefined;
    type: string;
};
/** @internal */
export declare const ThinkChunk$outboundSchema: z.ZodType<ThinkChunk$Outbound, z.ZodTypeDef, ThinkChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ThinkChunk$ {
    /** @deprecated use `ThinkChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ThinkChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `ThinkChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ThinkChunk$Outbound, z.ZodTypeDef, ThinkChunk>;
    /** @deprecated use `ThinkChunk$Outbound` instead. */
    type Outbound = ThinkChunk$Outbound;
}
export declare function thinkChunkToJSON(thinkChunk: ThinkChunk): string;
export declare function thinkChunkFromJSON(jsonString: string): SafeParseResult<ThinkChunk, SDKValidationError>;
//# sourceMappingURL=thinkchunk.d.ts.map