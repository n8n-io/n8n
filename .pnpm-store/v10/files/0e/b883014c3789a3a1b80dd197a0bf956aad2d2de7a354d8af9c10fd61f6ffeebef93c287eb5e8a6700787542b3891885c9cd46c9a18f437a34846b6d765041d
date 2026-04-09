import * as z from "zod/v3";
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
export declare function messageInputContentChunksToJSON(messageInputContentChunks: MessageInputContentChunks): string;
export declare function messageInputContentChunksFromJSON(jsonString: string): SafeParseResult<MessageInputContentChunks, SDKValidationError>;
//# sourceMappingURL=messageinputcontentchunks.d.ts.map