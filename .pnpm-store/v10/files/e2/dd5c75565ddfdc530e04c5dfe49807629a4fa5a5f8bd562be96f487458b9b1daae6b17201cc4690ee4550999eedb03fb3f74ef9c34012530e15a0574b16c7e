import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffDoneEvent } from "./agenthandoffdoneevent.js";
import { AgentHandoffStartedEvent } from "./agenthandoffstartedevent.js";
import { FunctionCallEvent } from "./functioncallevent.js";
import { MessageOutputEvent } from "./messageoutputevent.js";
import { ResponseDoneEvent } from "./responsedoneevent.js";
import { ResponseErrorEvent } from "./responseerrorevent.js";
import { ResponseStartedEvent } from "./responsestartedevent.js";
import { SSETypes } from "./ssetypes.js";
import { ToolExecutionDeltaEvent } from "./toolexecutiondeltaevent.js";
import { ToolExecutionDoneEvent } from "./toolexecutiondoneevent.js";
import { ToolExecutionStartedEvent } from "./toolexecutionstartedevent.js";
export type ConversationEventsData = (AgentHandoffDoneEvent & {
    type: "agent.handoff.done";
}) | (AgentHandoffStartedEvent & {
    type: "agent.handoff.started";
}) | (ResponseDoneEvent & {
    type: "conversation.response.done";
}) | (ResponseErrorEvent & {
    type: "conversation.response.error";
}) | (ResponseStartedEvent & {
    type: "conversation.response.started";
}) | (FunctionCallEvent & {
    type: "function.call.delta";
}) | (MessageOutputEvent & {
    type: "message.output.delta";
}) | (ToolExecutionDeltaEvent & {
    type: "tool.execution.delta";
}) | (ToolExecutionDoneEvent & {
    type: "tool.execution.done";
}) | (ToolExecutionStartedEvent & {
    type: "tool.execution.started";
});
export type ConversationEvents = {
    /**
     * Server side events sent when streaming a conversation response.
     */
    event: SSETypes;
    data: (AgentHandoffDoneEvent & {
        type: "agent.handoff.done";
    }) | (AgentHandoffStartedEvent & {
        type: "agent.handoff.started";
    }) | (ResponseDoneEvent & {
        type: "conversation.response.done";
    }) | (ResponseErrorEvent & {
        type: "conversation.response.error";
    }) | (ResponseStartedEvent & {
        type: "conversation.response.started";
    }) | (FunctionCallEvent & {
        type: "function.call.delta";
    }) | (MessageOutputEvent & {
        type: "message.output.delta";
    }) | (ToolExecutionDeltaEvent & {
        type: "tool.execution.delta";
    }) | (ToolExecutionDoneEvent & {
        type: "tool.execution.done";
    }) | (ToolExecutionStartedEvent & {
        type: "tool.execution.started";
    });
};
/** @internal */
export declare const ConversationEventsData$inboundSchema: z.ZodType<ConversationEventsData, z.ZodTypeDef, unknown>;
export declare function conversationEventsDataFromJSON(jsonString: string): SafeParseResult<ConversationEventsData, SDKValidationError>;
/** @internal */
export declare const ConversationEvents$inboundSchema: z.ZodType<ConversationEvents, z.ZodTypeDef, unknown>;
export declare function conversationEventsFromJSON(jsonString: string): SafeParseResult<ConversationEvents, SDKValidationError>;
//# sourceMappingURL=conversationevents.d.ts.map