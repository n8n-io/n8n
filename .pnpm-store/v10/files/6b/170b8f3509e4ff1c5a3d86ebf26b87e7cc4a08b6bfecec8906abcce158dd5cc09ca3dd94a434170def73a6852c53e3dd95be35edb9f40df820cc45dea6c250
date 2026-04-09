import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CodeInterpreterTool } from "./codeinterpretertool.js";
import { CompletionArgs } from "./completionargs.js";
import { DocumentLibraryTool } from "./documentlibrarytool.js";
import { FunctionTool } from "./functiontool.js";
import { GuardrailConfig } from "./guardrailconfig.js";
import { ImageGenerationTool } from "./imagegenerationtool.js";
import { WebSearchPremiumTool } from "./websearchpremiumtool.js";
import { WebSearchTool } from "./websearchtool.js";
export type AgentTools = (CodeInterpreterTool & {
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
export type Agent = {
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
    model: string;
    name: string;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    object?: "agent" | undefined;
    id: string;
    version: number;
    versions: Array<number>;
    createdAt: Date;
    updatedAt: Date;
    deploymentChat: boolean;
    source: string;
    versionMessage?: string | null | undefined;
};
/** @internal */
export declare const AgentTools$inboundSchema: z.ZodType<AgentTools, z.ZodTypeDef, unknown>;
export declare function agentToolsFromJSON(jsonString: string): SafeParseResult<AgentTools, SDKValidationError>;
/** @internal */
export declare const Agent$inboundSchema: z.ZodType<Agent, z.ZodTypeDef, unknown>;
export declare function agentFromJSON(jsonString: string): SafeParseResult<Agent, SDKValidationError>;
//# sourceMappingURL=agent.d.ts.map