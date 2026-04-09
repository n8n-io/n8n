import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentURLChunk, DocumentURLChunk$Outbound } from "./documenturlchunk.js";
import { ImageURLChunk, ImageURLChunk$Outbound } from "./imageurlchunk.js";
import { TextChunk, TextChunk$Outbound } from "./textchunk.js";
import { ThinkChunk, ThinkChunk$Outbound } from "./thinkchunk.js";
import { ToolFileChunk, ToolFileChunk$Outbound } from "./toolfilechunk.js";
import { ToolReferenceChunk, ToolReferenceChunk$Outbound } from "./toolreferencechunk.js";
export type MessageOutputContentChunks = ToolFileChunk | ToolReferenceChunk | TextChunk | ImageURLChunk | DocumentURLChunk | ThinkChunk;
/** @internal */
export declare const MessageOutputContentChunks$inboundSchema: z.ZodType<MessageOutputContentChunks, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputContentChunks$Outbound = ToolFileChunk$Outbound | ToolReferenceChunk$Outbound | TextChunk$Outbound | ImageURLChunk$Outbound | DocumentURLChunk$Outbound | ThinkChunk$Outbound;
/** @internal */
export declare const MessageOutputContentChunks$outboundSchema: z.ZodType<MessageOutputContentChunks$Outbound, z.ZodTypeDef, MessageOutputContentChunks>;
export declare function messageOutputContentChunksToJSON(messageOutputContentChunks: MessageOutputContentChunks): string;
export declare function messageOutputContentChunksFromJSON(jsonString: string): SafeParseResult<MessageOutputContentChunks, SDKValidationError>;
//# sourceMappingURL=messageoutputcontentchunks.d.ts.map