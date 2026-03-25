import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const AgentHandoffDoneEventType: {
    readonly AgentHandoffDone: "agent.handoff.done";
};
export type AgentHandoffDoneEventType = ClosedEnum<typeof AgentHandoffDoneEventType>;
export type AgentHandoffDoneEvent = {
    type?: AgentHandoffDoneEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    nextAgentId: string;
    nextAgentName: string;
};
/** @internal */
export declare const AgentHandoffDoneEventType$inboundSchema: z.ZodNativeEnum<typeof AgentHandoffDoneEventType>;
/** @internal */
export declare const AgentHandoffDoneEventType$outboundSchema: z.ZodNativeEnum<typeof AgentHandoffDoneEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffDoneEventType$ {
    /** @deprecated use `AgentHandoffDoneEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoffDone: "agent.handoff.done";
    }>;
    /** @deprecated use `AgentHandoffDoneEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoffDone: "agent.handoff.done";
    }>;
}
/** @internal */
export declare const AgentHandoffDoneEvent$inboundSchema: z.ZodType<AgentHandoffDoneEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentHandoffDoneEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    next_agent_id: string;
    next_agent_name: string;
};
/** @internal */
export declare const AgentHandoffDoneEvent$outboundSchema: z.ZodType<AgentHandoffDoneEvent$Outbound, z.ZodTypeDef, AgentHandoffDoneEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffDoneEvent$ {
    /** @deprecated use `AgentHandoffDoneEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentHandoffDoneEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentHandoffDoneEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentHandoffDoneEvent$Outbound, z.ZodTypeDef, AgentHandoffDoneEvent>;
    /** @deprecated use `AgentHandoffDoneEvent$Outbound` instead. */
    type Outbound = AgentHandoffDoneEvent$Outbound;
}
export declare function agentHandoffDoneEventToJSON(agentHandoffDoneEvent: AgentHandoffDoneEvent): string;
export declare function agentHandoffDoneEventFromJSON(jsonString: string): SafeParseResult<AgentHandoffDoneEvent, SDKValidationError>;
//# sourceMappingURL=agenthandoffdoneevent.d.ts.map