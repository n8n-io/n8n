import * as z from "zod/v3";
import { OpenEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage } from "./assistantmessage.js";
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
export declare const ChatCompletionChoice$inboundSchema: z.ZodType<ChatCompletionChoice, z.ZodTypeDef, unknown>;
export declare function chatCompletionChoiceFromJSON(jsonString: string): SafeParseResult<ChatCompletionChoice, SDKValidationError>;
//# sourceMappingURL=chatcompletionchoice.d.ts.map