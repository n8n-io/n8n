import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
import { ToolCall, ToolCall$Outbound } from "./toolcall.js";
export type AssistantMessageContent = string | Array<ContentChunk>;
export type AssistantMessage = {
    role?: "assistant" | undefined;
    content?: string | Array<ContentChunk> | null | undefined;
    toolCalls?: Array<ToolCall> | null | undefined;
    /**
     * Set this to `true` when adding an assistant message as prefix to condition the model response. The role of the prefix message is to force the model to start its answer by the content of the message.
     */
    prefix?: boolean | undefined;
};
/** @internal */
export declare const AssistantMessageContent$inboundSchema: z.ZodType<AssistantMessageContent, z.ZodTypeDef, unknown>;
/** @internal */
export type AssistantMessageContent$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const AssistantMessageContent$outboundSchema: z.ZodType<AssistantMessageContent$Outbound, z.ZodTypeDef, AssistantMessageContent>;
export declare function assistantMessageContentToJSON(assistantMessageContent: AssistantMessageContent): string;
export declare function assistantMessageContentFromJSON(jsonString: string): SafeParseResult<AssistantMessageContent, SDKValidationError>;
/** @internal */
export declare const AssistantMessage$inboundSchema: z.ZodType<AssistantMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type AssistantMessage$Outbound = {
    role: "assistant";
    content?: string | Array<ContentChunk$Outbound> | null | undefined;
    tool_calls?: Array<ToolCall$Outbound> | null | undefined;
    prefix: boolean;
};
/** @internal */
export declare const AssistantMessage$outboundSchema: z.ZodType<AssistantMessage$Outbound, z.ZodTypeDef, AssistantMessage>;
export declare function assistantMessageToJSON(assistantMessage: AssistantMessage): string;
export declare function assistantMessageFromJSON(jsonString: string): SafeParseResult<AssistantMessage, SDKValidationError>;
//# sourceMappingURL=assistantmessage.d.ts.map