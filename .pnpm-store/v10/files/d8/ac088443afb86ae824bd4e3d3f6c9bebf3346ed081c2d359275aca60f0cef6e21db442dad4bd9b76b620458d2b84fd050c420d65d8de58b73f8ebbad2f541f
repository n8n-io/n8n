import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ChatCompletionChoice } from "./chatcompletionchoice.js";
import { UsageInfo } from "./usageinfo.js";
export type FIMCompletionResponse = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo;
    created: number;
    choices: Array<ChatCompletionChoice>;
};
/** @internal */
export declare const FIMCompletionResponse$inboundSchema: z.ZodType<FIMCompletionResponse, z.ZodTypeDef, unknown>;
export declare function fimCompletionResponseFromJSON(jsonString: string): SafeParseResult<FIMCompletionResponse, SDKValidationError>;
//# sourceMappingURL=fimcompletionresponse.d.ts.map