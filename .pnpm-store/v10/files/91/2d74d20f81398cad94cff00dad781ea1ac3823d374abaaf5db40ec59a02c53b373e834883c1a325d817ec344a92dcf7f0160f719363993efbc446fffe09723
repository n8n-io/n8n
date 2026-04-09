import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { CodeInterpreterTool, CodeInterpreterTool$Outbound } from "./codeinterpretertool.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { DocumentLibraryTool, DocumentLibraryTool$Outbound } from "./documentlibrarytool.js";
import { FunctionTool, FunctionTool$Outbound } from "./functiontool.js";
import { GuardrailConfig, GuardrailConfig$Outbound } from "./guardrailconfig.js";
import { ImageGenerationTool, ImageGenerationTool$Outbound } from "./imagegenerationtool.js";
import { WebSearchPremiumTool, WebSearchPremiumTool$Outbound } from "./websearchpremiumtool.js";
import { WebSearchTool, WebSearchTool$Outbound } from "./websearchtool.js";
export declare const HandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type HandoffExecution = ClosedEnum<typeof HandoffExecution>;
export type Tools = (CodeInterpreterTool & {
    type: "code_interpreter";
}) | (DocumentLibraryTool & {
    type: "document_library";
}) | (FunctionTool & {
    type: "function";
}) | (ImageGenerationTool & {
    type: "image_generation";
}) | (WebSearchTool & {
    type: "web_search";
}) | (WebSearchPremiumTool & {
    type: "web_search_premium";
});
export type AgentVersion = string | number;
export type ConversationRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    store?: boolean | null | undefined;
    handoffExecution?: HandoffExecution | null | undefined;
    instructions?: string | null | undefined;
    /**
     * List of tools which are available to the model during the conversation.
     */
    tools?: Array<(CodeInterpreterTool & {
        type: "code_interpreter";
    }) | (DocumentLibraryTool & {
        type: "document_library";
    }) | (FunctionTool & {
        type: "function";
    }) | (ImageGenerationTool & {
        type: "image_generation";
    }) | (WebSearchTool & {
        type: "web_search";
    }) | (WebSearchPremiumTool & {
        type: "web_search_premium";
    })> | undefined;
    completionArgs?: CompletionArgs | null | undefined;
    guardrails?: Array<GuardrailConfig> | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    agentId?: string | null | undefined;
    agentVersion?: string | number | null | undefined;
    model?: string | null | undefined;
};
/** @internal */
export declare const HandoffExecution$outboundSchema: z.ZodNativeEnum<typeof HandoffExecution>;
/** @internal */
export type Tools$Outbound = (CodeInterpreterTool$Outbound & {
    type: "code_interpreter";
}) | (DocumentLibraryTool$Outbound & {
    type: "document_library";
}) | (FunctionTool$Outbound & {
    type: "function";
}) | (ImageGenerationTool$Outbound & {
    type: "image_generation";
}) | (WebSearchTool$Outbound & {
    type: "web_search";
}) | (WebSearchPremiumTool$Outbound & {
    type: "web_search_premium";
});
/** @internal */
export declare const Tools$outboundSchema: z.ZodType<Tools$Outbound, z.ZodTypeDef, Tools>;
export declare function toolsToJSON(tools: Tools): string;
/** @internal */
export type AgentVersion$Outbound = string | number;
/** @internal */
export declare const AgentVersion$outboundSchema: z.ZodType<AgentVersion$Outbound, z.ZodTypeDef, AgentVersion>;
export declare function agentVersionToJSON(agentVersion: AgentVersion): string;
/** @internal */
export type ConversationRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store?: boolean | null | undefined;
    handoff_execution?: string | null | undefined;
    instructions?: string | null | undefined;
    tools?: Array<(CodeInterpreterTool$Outbound & {
        type: "code_interpreter";
    }) | (DocumentLibraryTool$Outbound & {
        type: "document_library";
    }) | (FunctionTool$Outbound & {
        type: "function";
    }) | (ImageGenerationTool$Outbound & {
        type: "image_generation";
    }) | (WebSearchTool$Outbound & {
        type: "web_search";
    }) | (WebSearchPremiumTool$Outbound & {
        type: "web_search_premium";
    })> | undefined;
    completion_args?: CompletionArgs$Outbound | null | undefined;
    guardrails?: Array<GuardrailConfig$Outbound> | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    agent_id?: string | null | undefined;
    agent_version?: string | number | null | undefined;
    model?: string | null | undefined;
};
/** @internal */
export declare const ConversationRequest$outboundSchema: z.ZodType<ConversationRequest$Outbound, z.ZodTypeDef, ConversationRequest>;
export declare function conversationRequestToJSON(conversationRequest: ConversationRequest): string;
//# sourceMappingURL=conversationrequest.d.ts.map