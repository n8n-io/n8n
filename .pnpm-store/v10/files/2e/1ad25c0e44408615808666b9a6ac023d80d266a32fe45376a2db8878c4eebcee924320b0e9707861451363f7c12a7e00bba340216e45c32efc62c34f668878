import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionResponseStreamChoice, CompletionResponseStreamChoice$Outbound } from "./completionresponsestreamchoice.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
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
/** @internal */
export type CompletionChunk$Outbound = {
    id: string;
    object?: string | undefined;
    created?: number | undefined;
    model: string;
    usage?: UsageInfo$Outbound | undefined;
    choices: Array<CompletionResponseStreamChoice$Outbound>;
};
/** @internal */
export declare const CompletionChunk$outboundSchema: z.ZodType<CompletionChunk$Outbound, z.ZodTypeDef, CompletionChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionChunk$ {
    /** @deprecated use `CompletionChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionChunk$Outbound, z.ZodTypeDef, CompletionChunk>;
    /** @deprecated use `CompletionChunk$Outbound` instead. */
    type Outbound = CompletionChunk$Outbound;
}
export declare function completionChunkToJSON(completionChunk: CompletionChunk): string;
export declare function completionChunkFromJSON(jsonString: string): SafeParseResult<CompletionChunk, SDKValidationError>;
//# sourceMappingURL=completionchunk.d.ts.map