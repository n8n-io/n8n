import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { ToolCallConfirmation, ToolCallConfirmation$Outbound } from "./toolcallconfirmation.js";
export declare const ConversationAppendStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationAppendStreamRequestHandoffExecution = ClosedEnum<typeof ConversationAppendStreamRequestHandoffExecution>;
export type ConversationAppendStreamRequest = {
    inputs?: ConversationInputs | undefined;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationAppendStreamRequestHandoffExecution | undefined;
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
    toolConfirmations?: Array<ToolCallConfirmation> | null | undefined;
};
/** @internal */
export declare const ConversationAppendStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationAppendStreamRequestHandoffExecution>;
/** @internal */
export type ConversationAppendStreamRequest$Outbound = {
    inputs?: ConversationInputs$Outbound | undefined;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
    tool_confirmations?: Array<ToolCallConfirmation$Outbound> | null | undefined;
};
/** @internal */
export declare const ConversationAppendStreamRequest$outboundSchema: z.ZodType<ConversationAppendStreamRequest$Outbound, z.ZodTypeDef, ConversationAppendStreamRequest>;
export declare function conversationAppendStreamRequestToJSON(conversationAppendStreamRequest: ConversationAppendStreamRequest): string;
//# sourceMappingURL=conversationappendstreamrequest.d.ts.map