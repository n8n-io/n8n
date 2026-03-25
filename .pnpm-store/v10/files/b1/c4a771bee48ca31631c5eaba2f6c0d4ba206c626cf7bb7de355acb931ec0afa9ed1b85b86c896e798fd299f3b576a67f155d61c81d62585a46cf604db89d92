import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffDoneEvent, AgentHandoffDoneEvent$Outbound } from "./agenthandoffdoneevent.js";
import { AgentHandoffStartedEvent, AgentHandoffStartedEvent$Outbound } from "./agenthandoffstartedevent.js";
import { FunctionCallEvent, FunctionCallEvent$Outbound } from "./functioncallevent.js";
import { MessageOutputEvent, MessageOutputEvent$Outbound } from "./messageoutputevent.js";
import { ResponseDoneEvent, ResponseDoneEvent$Outbound } from "./responsedoneevent.js";
import { ResponseErrorEvent, ResponseErrorEvent$Outbound } from "./responseerrorevent.js";
import { ResponseStartedEvent, ResponseStartedEvent$Outbound } from "./responsestartedevent.js";
import { SSETypes } from "./ssetypes.js";
import { ToolExecutionDeltaEvent, ToolExecutionDeltaEvent$Outbound } from "./toolexecutiondeltaevent.js";
import { ToolExecutionDoneEvent, ToolExecutionDoneEvent$Outbound } from "./toolexecutiondoneevent.js";
import { ToolExecutionStartedEvent, ToolExecutionStartedEvent$Outbound } from "./toolexecutionstartedevent.js";
export type ConversationEventsData = (FunctionCallEvent & {
    type: "function.call.delta";
}) | (AgentHandoffDoneEvent & {
    type: "agent.handoff.done";
}) | (AgentHandoffStartedEvent & {
    type: "agent.handoff.started";
}) | (ToolExecutionDeltaEvent & {
    type: "tool.execution.delta";
}) | (ToolExecutionStartedEvent & {
    type: "tool.execution.started";
}) | (ResponseErrorEvent & {
    type: "conversation.response.error";
}) | (MessageOutputEvent & {
    type: "message.output.delta";
}) | (ToolExecutionDoneEvent & {
    type: "tool.execution.done";
}) | (ResponseDoneEvent & {
    type: "conversation.response.done";
}) | (ResponseStartedEvent & {
    type: "conversation.response.started";
});
export type ConversationEvents = {
    /**
     * Server side events sent when streaming a conversation response.
     */
    event: SSETypes;
    data: (FunctionCallEvent & {
        type: "function.call.delta";
    }) | (AgentHandoffDoneEvent & {
        type: "agent.handoff.done";
    }) | (AgentHandoffStartedEvent & {
        type: "agent.handoff.started";
    }) | (ToolExecutionDeltaEvent & {
        type: "tool.execution.delta";
    }) | (ToolExecutionStartedEvent & {
        type: "tool.execution.started";
    }) | (ResponseErrorEvent & {
        type: "conversation.response.error";
    }) | (MessageOutputEvent & {
        type: "message.output.delta";
    }) | (ToolExecutionDoneEvent & {
        type: "tool.execution.done";
    }) | (ResponseDoneEvent & {
        type: "conversation.response.done";
    }) | (ResponseStartedEvent & {
        type: "conversation.response.started";
    });
};
/** @internal */
export declare const ConversationEventsData$inboundSchema: z.ZodType<ConversationEventsData, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationEventsData$Outbound = (FunctionCallEvent$Outbound & {
    type: "function.call.delta";
}) | (AgentHandoffDoneEvent$Outbound & {
    type: "agent.handoff.done";
}) | (AgentHandoffStartedEvent$Outbound & {
    type: "agent.handoff.started";
}) | (ToolExecutionDeltaEvent$Outbound & {
    type: "tool.execution.delta";
}) | (ToolExecutionStartedEvent$Outbound & {
    type: "tool.execution.started";
}) | (ResponseErrorEvent$Outbound & {
    type: "conversation.response.error";
}) | (MessageOutputEvent$Outbound & {
    type: "message.output.delta";
}) | (ToolExecutionDoneEvent$Outbound & {
    type: "tool.execution.done";
}) | (ResponseDoneEvent$Outbound & {
    type: "conversation.response.done";
}) | (ResponseStartedEvent$Outbound & {
    type: "conversation.response.started";
});
/** @internal */
export declare const ConversationEventsData$outboundSchema: z.ZodType<ConversationEventsData$Outbound, z.ZodTypeDef, ConversationEventsData>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationEventsData$ {
    /** @deprecated use `ConversationEventsData$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationEventsData, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationEventsData$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationEventsData$Outbound, z.ZodTypeDef, ConversationEventsData>;
    /** @deprecated use `ConversationEventsData$Outbound` instead. */
    type Outbound = ConversationEventsData$Outbound;
}
export declare function conversationEventsDataToJSON(conversationEventsData: ConversationEventsData): string;
export declare function conversationEventsDataFromJSON(jsonString: string): SafeParseResult<ConversationEventsData, SDKValidationError>;
/** @internal */
export declare const ConversationEvents$inboundSchema: z.ZodType<ConversationEvents, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationEvents$Outbound = {
    event: string;
    data: (FunctionCallEvent$Outbound & {
        type: "function.call.delta";
    }) | (AgentHandoffDoneEvent$Outbound & {
        type: "agent.handoff.done";
    }) | (AgentHandoffStartedEvent$Outbound & {
        type: "agent.handoff.started";
    }) | (ToolExecutionDeltaEvent$Outbound & {
        type: "tool.execution.delta";
    }) | (ToolExecutionStartedEvent$Outbound & {
        type: "tool.execution.started";
    }) | (ResponseErrorEvent$Outbound & {
        type: "conversation.response.error";
    }) | (MessageOutputEvent$Outbound & {
        type: "message.output.delta";
    }) | (ToolExecutionDoneEvent$Outbound & {
        type: "tool.execution.done";
    }) | (ResponseDoneEvent$Outbound & {
        type: "conversation.response.done";
    }) | (ResponseStartedEvent$Outbound & {
        type: "conversation.response.started";
    });
};
/** @internal */
export declare const ConversationEvents$outboundSchema: z.ZodType<ConversationEvents$Outbound, z.ZodTypeDef, ConversationEvents>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationEvents$ {
    /** @deprecated use `ConversationEvents$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationEvents, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationEvents$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationEvents$Outbound, z.ZodTypeDef, ConversationEvents>;
    /** @deprecated use `ConversationEvents$Outbound` instead. */
    type Outbound = ConversationEvents$Outbound;
}
export declare function conversationEventsToJSON(conversationEvents: ConversationEvents): string;
export declare function conversationEventsFromJSON(jsonString: string): SafeParseResult<ConversationEvents, SDKValidationError>;
//# sourceMappingURL=conversationevents.d.ts.map