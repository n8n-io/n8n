import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionChunk, CompletionChunk$Outbound } from "./completionchunk.js";
export type CompletionEvent = {
    data: CompletionChunk;
};
/** @internal */
export declare const CompletionEvent$inboundSchema: z.ZodType<CompletionEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionEvent$Outbound = {
    data: CompletionChunk$Outbound;
};
/** @internal */
export declare const CompletionEvent$outboundSchema: z.ZodType<CompletionEvent$Outbound, z.ZodTypeDef, CompletionEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionEvent$ {
    /** @deprecated use `CompletionEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionEvent$Outbound, z.ZodTypeDef, CompletionEvent>;
    /** @deprecated use `CompletionEvent$Outbound` instead. */
    type Outbound = CompletionEvent$Outbound;
}
export declare function completionEventToJSON(completionEvent: CompletionEvent): string;
export declare function completionEventFromJSON(jsonString: string): SafeParseResult<CompletionEvent, SDKValidationError>;
//# sourceMappingURL=completionevent.d.ts.map