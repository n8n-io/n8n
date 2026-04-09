import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsListRequest = {
    page?: number | undefined;
    pageSize?: number | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
};
export type ResponseBody = components.ModelConversation | components.AgentConversation;
/** @internal */
export type AgentsApiV1ConversationsListRequest$Outbound = {
    page: number;
    page_size: number;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
};
/** @internal */
export declare const AgentsApiV1ConversationsListRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsListRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsListRequest>;
export declare function agentsApiV1ConversationsListRequestToJSON(agentsApiV1ConversationsListRequest: AgentsApiV1ConversationsListRequest): string;
/** @internal */
export declare const ResponseBody$inboundSchema: z.ZodType<ResponseBody, z.ZodTypeDef, unknown>;
export declare function responseBodyFromJSON(jsonString: string): SafeParseResult<ResponseBody, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationslist.d.ts.map