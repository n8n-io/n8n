import * as z from "zod/v3";
import * as components from "../components/index.js";
export type AgentsApiV1AgentsListRequest = {
    /**
     * Page number (0-indexed)
     */
    page?: number | undefined;
    /**
     * Number of agents per page
     */
    pageSize?: number | undefined;
    deploymentChat?: boolean | null | undefined;
    sources?: Array<components.RequestSource> | null | undefined;
    /**
     * Filter by agent name
     */
    name?: string | null | undefined;
    /**
     * Search agents by name or ID
     */
    search?: string | null | undefined;
    id?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
};
/** @internal */
export type AgentsApiV1AgentsListRequest$Outbound = {
    page: number;
    page_size: number;
    deployment_chat?: boolean | null | undefined;
    sources?: Array<string> | null | undefined;
    name?: string | null | undefined;
    search?: string | null | undefined;
    id?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
};
/** @internal */
export declare const AgentsApiV1AgentsListRequest$outboundSchema: z.ZodType<AgentsApiV1AgentsListRequest$Outbound, z.ZodTypeDef, AgentsApiV1AgentsListRequest>;
export declare function agentsApiV1AgentsListRequestToJSON(agentsApiV1AgentsListRequest: AgentsApiV1AgentsListRequest): string;
//# sourceMappingURL=agentsapiv1agentslist.d.ts.map