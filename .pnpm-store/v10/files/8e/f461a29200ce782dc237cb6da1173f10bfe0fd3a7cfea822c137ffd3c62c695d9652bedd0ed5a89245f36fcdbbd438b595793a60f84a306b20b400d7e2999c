import * as z from "zod";
import { OpenEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
export declare const FinishReason: {
    readonly Stop: "stop";
    readonly Length: "length";
    readonly ModelLength: "model_length";
    readonly Error: "error";
    readonly ToolCalls: "tool_calls";
};
export type FinishReason = OpenEnum<typeof FinishReason>;
export type ChatCompletionChoice = {
    index: number;
    message: AssistantMessage;
    finishReason: FinishReason;
};
/** @internal */
export declare const FinishReason$inboundSchema: z.ZodType<FinishReason, z.ZodTypeDef, unknown>;
/** @internal */
export declare const FinishReason$outboundSchema: z.ZodType<FinishReason, z.ZodTypeDef, FinishReason>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FinishReason$ {
    /** @deprecated use `FinishReason$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FinishReason, z.ZodTypeDef, unknown>;
    /** @deprecated use `FinishReason$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FinishReason, z.ZodTypeDef, FinishReason>;
}
/** @internal */
export declare const ChatCompletionChoice$inboundSchema: z.ZodType<ChatCompletionChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionChoice$Outbound = {
    index: number;
    message: AssistantMessage$Outbound;
    finish_reason: string;
};
/** @internal */
export declare const ChatCompletionChoice$outboundSchema: z.ZodType<ChatCompletionChoice$Outbound, z.ZodTypeDef, ChatCompletionChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionChoice$ {
    /** @deprecated use `ChatCompletionChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionChoice$Outbound, z.ZodTypeDef, ChatCompletionChoice>;
    /** @deprecated use `ChatCompletionChoice$Outbound` instead. */
    type Outbound = ChatCompletionChoice$Outbound;
}
export declare function chatCompletionChoiceToJSON(chatCompletionChoice: ChatCompletionChoice): string;
export declare function chatCompletionChoiceFromJSON(jsonString: string): SafeParseResult<ChatCompletionChoice, SDKValidationError>;
//# sourceMappingURL=chatcompletionchoice.d.ts.map