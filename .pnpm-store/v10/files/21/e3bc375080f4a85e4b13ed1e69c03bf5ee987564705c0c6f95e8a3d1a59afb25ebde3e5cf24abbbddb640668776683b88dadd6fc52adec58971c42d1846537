import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionChunk } from "./completionchunk.js";
export type CompletionEvent = {
    data: CompletionChunk;
};
/** @internal */
export declare const CompletionEvent$inboundSchema: z.ZodType<CompletionEvent, z.ZodTypeDef, unknown>;
export declare function completionEventFromJSON(jsonString: string): SafeParseResult<CompletionEvent, SDKValidationError>;
//# sourceMappingURL=completionevent.d.ts.map