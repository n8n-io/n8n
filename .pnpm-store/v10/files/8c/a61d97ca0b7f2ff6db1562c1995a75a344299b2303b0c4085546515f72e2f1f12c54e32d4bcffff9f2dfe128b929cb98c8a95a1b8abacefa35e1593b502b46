import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DocumentURLChunk } from "./documenturlchunk.js";
import { ImageURLChunk } from "./imageurlchunk.js";
import { TextChunk } from "./textchunk.js";
import { ThinkChunk } from "./thinkchunk.js";
import { ToolFileChunk } from "./toolfilechunk.js";
import { ToolReferenceChunk } from "./toolreferencechunk.js";
export type OutputContentChunks = ToolFileChunk | ToolReferenceChunk | TextChunk | ImageURLChunk | DocumentURLChunk | ThinkChunk;
/** @internal */
export declare const OutputContentChunks$inboundSchema: z.ZodType<OutputContentChunks, z.ZodTypeDef, unknown>;
export declare function outputContentChunksFromJSON(jsonString: string): SafeParseResult<OutputContentChunks, SDKValidationError>;
//# sourceMappingURL=outputcontentchunks.d.ts.map