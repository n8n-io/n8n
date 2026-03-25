import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CodeInterpreterTool, CodeInterpreterTool$Outbound } from "./codeinterpretertool.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { DocumentLibraryTool, DocumentLibraryTool$Outbound } from "./documentlibrarytool.js";
import { FunctionTool, FunctionTool$Outbound } from "./functiontool.js";
import { ImageGenerationTool, ImageGenerationTool$Outbound } from "./imagegenerationtool.js";
import { WebSearchPremiumTool, WebSearchPremiumTool$Outbound } from "./websearchpremiumtool.js";
import { WebSearchTool, WebSearchTool$Outbound } from "./websearchtool.js";
export type AgentCreationRequestTools = (DocumentLibraryTool & {
    type: "document_library";
}) | (FunctionTool & {
    type: "function";
}) | (CodeInterpreterTool & {
    type: "code_interpreter";
}) | (ImageGenerationTool & {
    type: "image_generation";
}) | (WebSearchTool & {
    type: "web_search";
}) | (WebSearchPremiumTool & {
    type: "web_search_premium";
});
export type AgentCreationRequest = {
    /**
     * Instruction prompt the model will follow during the conversation.
     */
    instructions?: string | null | undefined;
    /**
     * List of tools which are available to the model during the conversation.
     */
    tools?: Array<(DocumentLibraryTool & {
        type: "document_library";
    }) | (FunctionTool & {
        type: "function";
    }) | (CodeInterpreterTool & {
        type: "code_interpreter";
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
    model: string;
    name: string;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
};
/** @internal */
export declare const AgentCreationRequestTools$inboundSchema: z.ZodType<AgentCreationRequestTools, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentCreationRequestTools$Outbound = (DocumentLibraryTool$Outbound & {
    type: "document_library";
}) | (FunctionTool$Outbound & {
    type: "function";
}) | (CodeInterpreterTool$Outbound & {
    type: "code_interpreter";
}) | (ImageGenerationTool$Outbound & {
    type: "image_generation";
}) | (WebSearchTool$Outbound & {
    type: "web_search";
}) | (WebSearchPremiumTool$Outbound & {
    type: "web_search_premium";
});
/** @internal */
export declare const AgentCreationRequestTools$outboundSchema: z.ZodType<AgentCreationRequestTools$Outbound, z.ZodTypeDef, AgentCreationRequestTools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentCreationRequestTools$ {
    /** @deprecated use `AgentCreationRequestTools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentCreationRequestTools, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentCreationRequestTools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentCreationRequestTools$Outbound, z.ZodTypeDef, AgentCreationRequestTools>;
    /** @deprecated use `AgentCreationRequestTools$Outbound` instead. */
    type Outbound = AgentCreationRequestTools$Outbound;
}
export declare function agentCreationRequestToolsToJSON(agentCreationRequestTools: AgentCreationRequestTools): string;
export declare function agentCreationRequestToolsFromJSON(jsonString: string): SafeParseResult<AgentCreationRequestTools, SDKValidationError>;
/** @internal */
export declare const AgentCreationRequest$inboundSchema: z.ZodType<AgentCreationRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentCreationRequest$Outbound = {
    instructions?: string | null | undefined;
    tools?: Array<(DocumentLibraryTool$Outbound & {
        type: "document_library";
    }) | (FunctionTool$Outbound & {
        type: "function";
    }) | (CodeInterpreterTool$Outbound & {
        type: "code_interpreter";
    }) | (ImageGenerationTool$Outbound & {
        type: "image_generation";
    }) | (WebSearchTool$Outbound & {
        type: "web_search";
    }) | (WebSearchPremiumTool$Outbound & {
        type: "web_search_premium";
    })> | undefined;
    completion_args?: CompletionArgs$Outbound | undefined;
    model: string;
    name: string;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
};
/** @internal */
export declare const AgentCreationRequest$outboundSchema: z.ZodType<AgentCreationRequest$Outbound, z.ZodTypeDef, AgentCreationRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentCreationRequest$ {
    /** @deprecated use `AgentCreationRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentCreationRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentCreationRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentCreationRequest$Outbound, z.ZodTypeDef, AgentCreationRequest>;
    /** @deprecated use `AgentCreationRequest$Outbound` instead. */
    type Outbound = AgentCreationRequest$Outbound;
}
export declare function agentCreationRequestToJSON(agentCreationRequest: AgentCreationRequest): string;
export declare function agentCreationRequestFromJSON(jsonString: string): SafeParseResult<AgentCreationRequest, SDKValidationError>;
//# sourceMappingURL=agentcreationrequest.d.ts.map