import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentHandoffEntry = {
    object?: "entry" | undefined;
    type?: "agent.handoff" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    previousAgentId: string;
    previousAgentName: string;
    nextAgentId: string;
    nextAgentName: string;
};
/** @internal */
export declare const AgentHandoffEntry$inboundSchema: z.ZodType<AgentHandoffEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentHandoffEntry$Outbound = {
    object: "entry";
    type: "agent.handoff";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    previous_agent_id: string;
    previous_agent_name: string;
    next_agent_id: string;
    next_agent_name: string;
};
/** @internal */
export declare const AgentHandoffEntry$outboundSchema: z.ZodType<AgentHandoffEntry$Outbound, z.ZodTypeDef, AgentHandoffEntry>;
export declare function agentHandoffEntryToJSON(agentHandoffEntry: AgentHandoffEntry): string;
export declare function agentHandoffEntryFromJSON(jsonString: string): SafeParseResult<AgentHandoffEntry, SDKValidationError>;
//# sourceMappingURL=agenthandoffentry.d.ts.map