import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const AgentHandoffEntryObject: {
    readonly Entry: "entry";
};
export type AgentHandoffEntryObject = ClosedEnum<typeof AgentHandoffEntryObject>;
export declare const AgentHandoffEntryType: {
    readonly AgentHandoff: "agent.handoff";
};
export type AgentHandoffEntryType = ClosedEnum<typeof AgentHandoffEntryType>;
export type AgentHandoffEntry = {
    object?: AgentHandoffEntryObject | undefined;
    type?: AgentHandoffEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    previousAgentId: string;
    previousAgentName: string;
    nextAgentId: string;
    nextAgentName: string;
};
/** @internal */
export declare const AgentHandoffEntryObject$inboundSchema: z.ZodNativeEnum<typeof AgentHandoffEntryObject>;
/** @internal */
export declare const AgentHandoffEntryObject$outboundSchema: z.ZodNativeEnum<typeof AgentHandoffEntryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffEntryObject$ {
    /** @deprecated use `AgentHandoffEntryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `AgentHandoffEntryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const AgentHandoffEntryType$inboundSchema: z.ZodNativeEnum<typeof AgentHandoffEntryType>;
/** @internal */
export declare const AgentHandoffEntryType$outboundSchema: z.ZodNativeEnum<typeof AgentHandoffEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffEntryType$ {
    /** @deprecated use `AgentHandoffEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoff: "agent.handoff";
    }>;
    /** @deprecated use `AgentHandoffEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly AgentHandoff: "agent.handoff";
    }>;
}
/** @internal */
export declare const AgentHandoffEntry$inboundSchema: z.ZodType<AgentHandoffEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentHandoffEntry$Outbound = {
    object: string;
    type: string;
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
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentHandoffEntry$ {
    /** @deprecated use `AgentHandoffEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentHandoffEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentHandoffEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentHandoffEntry$Outbound, z.ZodTypeDef, AgentHandoffEntry>;
    /** @deprecated use `AgentHandoffEntry$Outbound` instead. */
    type Outbound = AgentHandoffEntry$Outbound;
}
export declare function agentHandoffEntryToJSON(agentHandoffEntry: AgentHandoffEntry): string;
export declare function agentHandoffEntryFromJSON(jsonString: string): SafeParseResult<AgentHandoffEntry, SDKValidationError>;
//# sourceMappingURL=agenthandoffentry.d.ts.map