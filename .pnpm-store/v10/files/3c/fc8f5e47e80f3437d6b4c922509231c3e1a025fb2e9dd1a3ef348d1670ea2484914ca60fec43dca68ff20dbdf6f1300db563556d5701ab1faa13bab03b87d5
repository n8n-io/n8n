import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsListRequest = {
    page?: number | undefined;
    pageSize?: number | undefined;
};
export type ResponseBody = components.ModelConversation | components.AgentConversation;
/** @internal */
export declare const AgentsApiV1ConversationsListRequest$inboundSchema: z.ZodType<AgentsApiV1ConversationsListRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1ConversationsListRequest$Outbound = {
    page: number;
    page_size: number;
};
/** @internal */
export declare const AgentsApiV1ConversationsListRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsListRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsListRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1ConversationsListRequest$ {
    /** @deprecated use `AgentsApiV1ConversationsListRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1ConversationsListRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1ConversationsListRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1ConversationsListRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsListRequest>;
    /** @deprecated use `AgentsApiV1ConversationsListRequest$Outbound` instead. */
    type Outbound = AgentsApiV1ConversationsListRequest$Outbound;
}
export declare function agentsApiV1ConversationsListRequestToJSON(agentsApiV1ConversationsListRequest: AgentsApiV1ConversationsListRequest): string;
export declare function agentsApiV1ConversationsListRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsListRequest, SDKValidationError>;
/** @internal */
export declare const ResponseBody$inboundSchema: z.ZodType<ResponseBody, z.ZodTypeDef, unknown>;
/** @internal */
export type ResponseBody$Outbound = components.ModelConversation$Outbound | components.AgentConversation$Outbound;
/** @internal */
export declare const ResponseBody$outboundSchema: z.ZodType<ResponseBody$Outbound, z.ZodTypeDef, ResponseBody>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseBody$ {
    /** @deprecated use `ResponseBody$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ResponseBody, z.ZodTypeDef, unknown>;
    /** @deprecated use `ResponseBody$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ResponseBody$Outbound, z.ZodTypeDef, ResponseBody>;
    /** @deprecated use `ResponseBody$Outbound` instead. */
    type Outbound = ResponseBody$Outbound;
}
export declare function responseBodyToJSON(responseBody: ResponseBody): string;
export declare function responseBodyFromJSON(jsonString: string): SafeParseResult<ResponseBody, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationslist.d.ts.map