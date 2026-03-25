import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
import { ThinkChunk, ThinkChunk$Outbound } from "./thinkchunk.js";
export type SystemMessageContentChunks = (TextChunk & {
    type: "text";
}) | (ThinkChunk & {
    type: "thinking";
});
/** @internal */
export declare const SystemMessageContentChunks$inboundSchema: z.ZodType<SystemMessageContentChunks, z.ZodTypeDef, unknown>;
/** @internal */
export type SystemMessageContentChunks$Outbound = (TextChunk$Outbound & {
    type: "text";
}) | (ThinkChunk$Outbound & {
    type: "thinking";
});
/** @internal */
export declare const SystemMessageContentChunks$outboundSchema: z.ZodType<SystemMessageContentChunks$Outbound, z.ZodTypeDef, SystemMessageContentChunks>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SystemMessageContentChunks$ {
    /** @deprecated use `SystemMessageContentChunks$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SystemMessageContentChunks, z.ZodTypeDef, unknown>;
    /** @deprecated use `SystemMessageContentChunks$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SystemMessageContentChunks$Outbound, z.ZodTypeDef, SystemMessageContentChunks>;
    /** @deprecated use `SystemMessageContentChunks$Outbound` instead. */
    type Outbound = SystemMessageContentChunks$Outbound;
}
export declare function systemMessageContentChunksToJSON(systemMessageContentChunks: SystemMessageContentChunks): string;
export declare function systemMessageContentChunksFromJSON(jsonString: string): SafeParseResult<SystemMessageContentChunks, SDKValidationError>;
//# sourceMappingURL=systemmessagecontentchunks.d.ts.map