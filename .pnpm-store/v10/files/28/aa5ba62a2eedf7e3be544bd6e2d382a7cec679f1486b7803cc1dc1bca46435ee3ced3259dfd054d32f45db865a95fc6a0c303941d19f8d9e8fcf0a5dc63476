import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ConversationUsageInfo = {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    connectorTokens?: number | null | undefined;
    connectors?: {
        [k: string]: number;
    } | null | undefined;
};
/** @internal */
export declare const ConversationUsageInfo$inboundSchema: z.ZodType<ConversationUsageInfo, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationUsageInfo$Outbound = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    connector_tokens?: number | null | undefined;
    connectors?: {
        [k: string]: number;
    } | null | undefined;
};
/** @internal */
export declare const ConversationUsageInfo$outboundSchema: z.ZodType<ConversationUsageInfo$Outbound, z.ZodTypeDef, ConversationUsageInfo>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationUsageInfo$ {
    /** @deprecated use `ConversationUsageInfo$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationUsageInfo, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationUsageInfo$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationUsageInfo$Outbound, z.ZodTypeDef, ConversationUsageInfo>;
    /** @deprecated use `ConversationUsageInfo$Outbound` instead. */
    type Outbound = ConversationUsageInfo$Outbound;
}
export declare function conversationUsageInfoToJSON(conversationUsageInfo: ConversationUsageInfo): string;
export declare function conversationUsageInfoFromJSON(jsonString: string): SafeParseResult<ConversationUsageInfo, SDKValidationError>;
//# sourceMappingURL=conversationusageinfo.d.ts.map