import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const AgentHandoffStartedEventType: {
    readonly AgentHandoffStarted: "agent.handoff.started";
};
export type AgentHandoffStartedEventType = ClosedEnum<typeof AgentHandoffStartedEventType>;
export type AgentHandoffStartedEvent = {
    type?: AgentHandoffStartedEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    previousAgentId: string;
    previousAgentName: string;
};
/** @internal */
export declare const AgentHandoffStartedEventType$inboundSchema: z.ZodNativeEnum<typeof AgentHandoffStartedEventType>;
/** @internal */
export declare const AgentHandoffStartedEventType$outboundSchema: z.ZodNativeEnum<typeof AgentHandoffStartedEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffStartedEventType$ {
    /** @deprecated use `AgentHandoffStartedEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoffStarted: "agent.handoff.started";
    }>;
    /** @deprecated use `AgentHandoffStartedEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoffStarted: "agent.handoff.started";
    }>;
}
/** @internal */
export declare const AgentHandoffStartedEvent$inboundSchema: z.ZodType<AgentHandoffStartedEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentHandoffStartedEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    previous_agent_id: string;
    previous_agent_name: string;
};
/** @internal */
export declare const AgentHandoffStartedEvent$outboundSchema: z.ZodType<AgentHandoffStartedEvent$Outbound, z.ZodTypeDef, AgentHandoffStartedEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffStartedEvent$ {
    /** @deprecated use `AgentHandoffStartedEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentHandoffStartedEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentHandoffStartedEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentHandoffStartedEvent$Outbound, z.ZodTypeDef, AgentHandoffStartedEvent>;
    /** @deprecated use `AgentHandoffStartedEvent$Outbound` instead. */
    type Outbound = AgentHandoffStartedEvent$Outbound;
}
export declare function agentHandoffStartedEventToJSON(agentHandoffStartedEvent: AgentHandoffStartedEvent): string;
export declare function agentHandoffStartedEventFromJSON(jsonString: string): SafeParseResult<AgentHandoffStartedEvent, SDKValidationError>;
//# sourceMappingURL=agenthandoffstartedevent.d.ts.map