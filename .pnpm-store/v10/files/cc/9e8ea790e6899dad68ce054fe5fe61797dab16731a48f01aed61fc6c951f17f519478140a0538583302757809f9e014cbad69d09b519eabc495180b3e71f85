import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffEntry } from "./agenthandoffentry.js";
import { ConversationUsageInfo } from "./conversationusageinfo.js";
import { FunctionCallEntry } from "./functioncallentry.js";
import { MessageOutputEntry } from "./messageoutputentry.js";
import { ToolExecutionEntry } from "./toolexecutionentry.js";
export type Outputs = AgentHandoffEntry | FunctionCallEntry | ToolExecutionEntry | MessageOutputEntry;
export type Guardrails = {};
/**
 * The response after appending new entries to the conversation.
 */
export type ConversationResponse = {
    object?: "conversation.response" | undefined;
    conversationId: string;
    outputs: Array<AgentHandoffEntry | FunctionCallEntry | ToolExecutionEntry | MessageOutputEntry>;
    usage: ConversationUsageInfo;
    guardrails?: Array<Guardrails> | null | undefined;
};
/** @internal */
export declare const Outputs$inboundSchema: z.ZodType<Outputs, z.ZodTypeDef, unknown>;
export declare function outputsFromJSON(jsonString: string): SafeParseResult<Outputs, SDKValidationError>;
/** @internal */
export declare const Guardrails$inboundSchema: z.ZodType<Guardrails, z.ZodTypeDef, unknown>;
export declare function guardrailsFromJSON(jsonString: string): SafeParseResult<Guardrails, SDKValidationError>;
/** @internal */
export declare const ConversationResponse$inboundSchema: z.ZodType<ConversationResponse, z.ZodTypeDef, unknown>;
export declare function conversationResponseFromJSON(jsonString: string): SafeParseResult<ConversationResponse, SDKValidationError>;
//# sourceMappingURL=conversationresponse.d.ts.map