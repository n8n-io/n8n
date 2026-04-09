import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { ToolCallConfirmation, ToolCallConfirmation$Outbound } from "./toolcallconfirmation.js";
export declare const ConversationAppendRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationAppendRequestHandoffExecution = ClosedEnum<typeof ConversationAppendRequestHandoffExecution>;
export type ConversationAppendRequest = {
    inputs?: ConversationInputs | undefined;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationAppendRequestHandoffExecution | undefined;
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
    toolConfirmations?: Array<ToolCallConfirmation> | null | undefined;
};
/** @internal */
export declare const ConversationAppendRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationAppendRequestHandoffExecution>;
/** @internal */
export type ConversationAppendRequest$Outbound = {
    inputs?: ConversationInputs$Outbound | undefined;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
    tool_confirmations?: Array<ToolCallConfirmation$Outbound> | null | undefined;
};
/** @internal */
export declare const ConversationAppendRequest$outboundSchema: z.ZodType<ConversationAppendRequest$Outbound, z.ZodTypeDef, ConversationAppendRequest>;
export declare function conversationAppendRequestToJSON(conversationAppendRequest: ConversationAppendRequest): string;
//# sourceMappingURL=conversationappendrequest.d.ts.map