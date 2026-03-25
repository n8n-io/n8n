import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentURLChunk, DocumentURLChunk$Outbound } from "./documenturlchunk.js";
import { ImageURLChunk, ImageURLChunk$Outbound } from "./imageurlchunk.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
import { ThinkChunk, ThinkChunk$Outbound } from "./thinkchunk.js";
import { ToolFileChunk, ToolFileChunk$Outbound } from "./toolfilechunk.js";
export type MessageInputContentChunks = ToolFileChunk | TextChunk | ImageURLChunk | DocumentURLChunk | ThinkChunk;
/** @internal */
export declare const MessageInputContentChunks$inboundSchema: z.ZodType<MessageInputContentChunks, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageInputContentChunks$Outbound = ToolFileChunk$Outbound | TextChunk$Outbound | ImageURLChunk$Outbound | DocumentURLChunk$Outbound | ThinkChunk$Outbound;
/** @internal */
export declare const MessageInputContentChunks$outboundSchema: z.ZodType<MessageInputContentChunks$Outbound, z.ZodTypeDef, MessageInputContentChunks>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageInputContentChunks$ {
    /** @deprecated use `MessageInputContentChunks$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageInputContentChunks, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageInputContentChunks$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageInputContentChunks$Outbound, z.ZodTypeDef, MessageInputContentChunks>;
    /** @deprecated use `MessageInputContentChunks$Outbound` instead. */
    type Outbound = MessageInputContentChunks$Outbound;
}
export declare function messageInputContentChunksToJSON(messageInputContentChunks: MessageInputContentChunks): string;
export declare function messageInputContentChunksFromJSON(jsonString: string): SafeParseResult<MessageInputContentChunks, SDKValidationError>;
//# sourceMappingURL=messageinputcontentchunks.d.ts.map