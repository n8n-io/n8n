import * as z from "zod/v3";
import { CodeInterpreterTool, CodeInterpreterTool$Outbound } from "./codeinterpretertool.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { DocumentLibraryTool, DocumentLibraryTool$Outbound } from "./documentlibrarytool.js";
import { FunctionTool, FunctionTool$Outbound } from "./functiontool.js";
import { GuardrailConfig, GuardrailConfig$Outbound } from "./guardrailconfig.js";
import { ImageGenerationTool, ImageGenerationTool$Outbound } from "./imagegenerationtool.js";
import { WebSearchPremiumTool, WebSearchPremiumTool$Outbound } from "./websearchpremiumtool.js";
import { WebSearchTool, WebSearchTool$Outbound } from "./websearchtool.js";
export type AgentUpdateRequestTools = (CodeInterpreterTool & {
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
export type AgentUpdateRequest = {
    /**
     * Instruction prompt the model will follow during the conversation.
     */
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
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
    guardrails?: Array<GuardrailConfig> | null | undefined;
    model?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
    deploymentChat?: boolean | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    versionMessage?: string | null | undefined;
};
/** @internal */
export type AgentUpdateRequestTools$Outbound = (CodeInterpreterTool$Outbound & {
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
export declare const AgentUpdateRequestTools$outboundSchema: z.ZodType<AgentUpdateRequestTools$Outbound, z.ZodTypeDef, AgentUpdateRequestTools>;
export declare function agentUpdateRequestToolsToJSON(agentUpdateRequestTools: AgentUpdateRequestTools): string;
/** @internal */
export type AgentUpdateRequest$Outbound = {
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
    completion_args?: CompletionArgs$Outbound | undefined;
    guardrails?: Array<GuardrailConfig$Outbound> | null | undefined;
    model?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
    deployment_chat?: boolean | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    version_message?: string | null | undefined;
};
/** @internal */
export declare const AgentUpdateRequest$outboundSchema: z.ZodType<AgentUpdateRequest$Outbound, z.ZodTypeDef, AgentUpdateRequest>;
export declare function agentUpdateRequestToJSON(agentUpdateRequest: AgentUpdateRequest): string;
//# sourceMappingURL=agentupdaterequest.d.ts.map