import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionResponseStreamChoice } from "./completionresponsestreamchoice.js";
import { UsageInfo } from "./usageinfo.js";
export type CompletionChunk = {
    id: string;
    object?: string | undefined;
    created?: number | undefined;
    model: string;
    usage?: UsageInfo | undefined;
    choices: Array<CompletionResponseStreamChoice>;
};
/** @internal */
export declare const CompletionChunk$inboundSchema: z.ZodType<CompletionChunk, z.ZodTypeDef, unknown>;
export declare function completionChunkFromJSON(jsonString: string): SafeParseResult<CompletionChunk, SDKValidationError>;
//# sourceMappingURL=completionchunk.d.ts.map