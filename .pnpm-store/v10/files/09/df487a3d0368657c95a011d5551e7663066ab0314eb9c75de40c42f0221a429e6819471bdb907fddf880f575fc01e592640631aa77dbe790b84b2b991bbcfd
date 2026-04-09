import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ChatCompletionChoice } from "./chatcompletionchoice.js";
import { UsageInfo } from "./usageinfo.js";
export type ChatCompletionResponse = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo;
    created: number;
    choices: Array<ChatCompletionChoice>;
};
/** @internal */
export declare const ChatCompletionResponse$inboundSchema: z.ZodType<ChatCompletionResponse, z.ZodTypeDef, unknown>;
export declare function chatCompletionResponseFromJSON(jsonString: string): SafeParseResult<ChatCompletionResponse, SDKValidationError>;
//# sourceMappingURL=chatcompletionresponse.d.ts.map