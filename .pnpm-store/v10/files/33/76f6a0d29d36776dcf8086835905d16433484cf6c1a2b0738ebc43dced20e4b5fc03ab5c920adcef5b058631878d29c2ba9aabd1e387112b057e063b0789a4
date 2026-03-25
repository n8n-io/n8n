import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ChatCompletionChoice, ChatCompletionChoice$Outbound } from "./chatcompletionchoice.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
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
/** @internal */
export type ChatCompletionResponse$Outbound = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo$Outbound;
    created: number;
    choices: Array<ChatCompletionChoice$Outbound>;
};
/** @internal */
export declare const ChatCompletionResponse$outboundSchema: z.ZodType<ChatCompletionResponse$Outbound, z.ZodTypeDef, ChatCompletionResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionResponse$ {
    /** @deprecated use `ChatCompletionResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionResponse$Outbound, z.ZodTypeDef, ChatCompletionResponse>;
    /** @deprecated use `ChatCompletionResponse$Outbound` instead. */
    type Outbound = ChatCompletionResponse$Outbound;
}
export declare function chatCompletionResponseToJSON(chatCompletionResponse: ChatCompletionResponse): string;
export declare function chatCompletionResponseFromJSON(jsonString: string): SafeParseResult<ChatCompletionResponse, SDKValidationError>;
//# sourceMappingURL=chatcompletionresponse.d.ts.map