import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1AgentsUpdateRequest = {
    agentId: string;
    agentUpdateRequest: components.AgentUpdateRequest;
};
/** @internal */
export declare const AgentsApiV1AgentsUpdateRequest$inboundSchema: z.ZodType<AgentsApiV1AgentsUpdateRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1AgentsUpdateRequest$Outbound = {
    agent_id: string;
    AgentUpdateRequest: components.AgentUpdateRequest$Outbound;
};
/** @internal */
export declare const AgentsApiV1AgentsUpdateRequest$outboundSchema: z.ZodType<AgentsApiV1AgentsUpdateRequest$Outbound, z.ZodTypeDef, AgentsApiV1AgentsUpdateRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1AgentsUpdateRequest$ {
    /** @deprecated use `AgentsApiV1AgentsUpdateRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1AgentsUpdateRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1AgentsUpdateRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1AgentsUpdateRequest$Outbound, z.ZodTypeDef, AgentsApiV1AgentsUpdateRequest>;
    /** @deprecated use `AgentsApiV1AgentsUpdateRequest$Outbound` instead. */
    type Outbound = AgentsApiV1AgentsUpdateRequest$Outbound;
}
export declare function agentsApiV1AgentsUpdateRequestToJSON(agentsApiV1AgentsUpdateRequest: AgentsApiV1AgentsUpdateRequest): string;
export declare function agentsApiV1AgentsUpdateRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1AgentsUpdateRequest, SDKValidationError>;
//# sourceMappingURL=agentsapiv1agentsupdate.d.ts.map