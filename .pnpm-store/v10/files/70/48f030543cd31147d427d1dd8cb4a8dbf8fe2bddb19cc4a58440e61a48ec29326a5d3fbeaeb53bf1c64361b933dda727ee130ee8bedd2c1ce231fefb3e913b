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
export type ModelConversationTools = (CodeInterpreterTool & {
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
export type ModelConversation = {
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
    /**
     * Name given to the conversation.
     */
    name?: string | null | undefined;
    /**
     * Description of the what the conversation is about.
     */
    description?: string | null | undefined;
    /**
     * Custom metadata for the conversation.
     */
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    object?: "conversation" | undefined;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    model: string;
};
/** @internal */
export declare const ModelConversationTools$inboundSchema: z.ZodType<ModelConversationTools, z.ZodTypeDef, unknown>;
export declare function modelConversationToolsFromJSON(jsonString: string): SafeParseResult<ModelConversationTools, SDKValidationError>;
/** @internal */
export declare const ModelConversation$inboundSchema: z.ZodType<ModelConversation, z.ZodTypeDef, unknown>;
export declare function modelConversationFromJSON(jsonString: string): SafeParseResult<ModelConversation, SDKValidationError>;
//# sourceMappingURL=modelconversation.d.ts.map