import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentHandoffStartedEvent = {
    type?: "agent.handoff.started" | undefined;
    createdAt?: Date | undefined;
    outputIndex: number | undefined;
    id: string;
    previousAgentId: string;
    previousAgentName: string;
};
/** @internal */
export declare const AgentHandoffStartedEvent$inboundSchema: z.ZodType<AgentHandoffStartedEvent, z.ZodTypeDef, unknown>;
export declare function agentHandoffStartedEventFromJSON(jsonString: string): SafeParseResult<AgentHandoffStartedEvent, SDKValidationError>;
//# sourceMappingURL=agenthandoffstartedevent.d.ts.map