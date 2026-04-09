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
export declare const ConversationStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationStreamRequestHandoffExecution = ClosedEnum<typeof ConversationStreamRequestHandoffExecution>;
export type ConversationStreamRequestTools = (CodeInterpreterTool & {
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
export type ConversationStreamRequestAgentVersion = string | number;
export type ConversationStreamRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    store?: boolean | null | undefined;
    handoffExecution?: ConversationStreamRequestHandoffExecution | null | undefined;
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
export declare const ConversationStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationStreamRequestHandoffExecution>;
/** @internal */
export type ConversationStreamRequestTools$Outbound = (CodeInterpreterTool$Outbound & {
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
export declare const ConversationStreamRequestTools$outboundSchema: z.ZodType<ConversationStreamRequestTools$Outbound, z.ZodTypeDef, ConversationStreamRequestTools>;
export declare function conversationStreamRequestToolsToJSON(conversationStreamRequestTools: ConversationStreamRequestTools): string;
/** @internal */
export type ConversationStreamRequestAgentVersion$Outbound = string | number;
/** @internal */
export declare const ConversationStreamRequestAgentVersion$outboundSchema: z.ZodType<ConversationStreamRequestAgentVersion$Outbound, z.ZodTypeDef, ConversationStreamRequestAgentVersion>;
export declare function conversationStreamRequestAgentVersionToJSON(conversationStreamRequestAgentVersion: ConversationStreamRequestAgentVersion): string;
/** @internal */
export type ConversationStreamRequest$Outbound = {
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
export declare const ConversationStreamRequest$outboundSchema: z.ZodType<ConversationStreamRequest$Outbound, z.ZodTypeDef, ConversationStreamRequest>;
export declare function conversationStreamRequestToJSON(conversationStreamRequest: ConversationStreamRequest): string;
//# sourceMappingURL=conversationstreamrequest.d.ts.map