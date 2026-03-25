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
export type AgentUpdateRequestTools = (DocumentLibraryTool & {
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
export type AgentUpdateRequest = {
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
    model?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
};
/** @internal */
export declare const AgentUpdateRequestTools$inboundSchema: z.ZodType<AgentUpdateRequestTools, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentUpdateRequestTools$Outbound = (DocumentLibraryTool$Outbound & {
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
export declare const AgentUpdateRequestTools$outboundSchema: z.ZodType<AgentUpdateRequestTools$Outbound, z.ZodTypeDef, AgentUpdateRequestTools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentUpdateRequestTools$ {
    /** @deprecated use `AgentUpdateRequestTools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentUpdateRequestTools, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentUpdateRequestTools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentUpdateRequestTools$Outbound, z.ZodTypeDef, AgentUpdateRequestTools>;
    /** @deprecated use `AgentUpdateRequestTools$Outbound` instead. */
    type Outbound = AgentUpdateRequestTools$Outbound;
}
export declare function agentUpdateRequestToolsToJSON(agentUpdateRequestTools: AgentUpdateRequestTools): string;
export declare function agentUpdateRequestToolsFromJSON(jsonString: string): SafeParseResult<AgentUpdateRequestTools, SDKValidationError>;
/** @internal */
export declare const AgentUpdateRequest$inboundSchema: z.ZodType<AgentUpdateRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentUpdateRequest$Outbound = {
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
    model?: string | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    handoffs?: Array<string> | null | undefined;
};
/** @internal */
export declare const AgentUpdateRequest$outboundSchema: z.ZodType<AgentUpdateRequest$Outbound, z.ZodTypeDef, AgentUpdateRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentUpdateRequest$ {
    /** @deprecated use `AgentUpdateRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentUpdateRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentUpdateRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentUpdateRequest$Outbound, z.ZodTypeDef, AgentUpdateRequest>;
    /** @deprecated use `AgentUpdateRequest$Outbound` instead. */
    type Outbound = AgentUpdateRequest$Outbound;
}
export declare function agentUpdateRequestToJSON(agentUpdateRequest: AgentUpdateRequest): string;
export declare function agentUpdateRequestFromJSON(jsonString: string): SafeParseResult<AgentUpdateRequest, SDKValidationError>;
//# sourceMappingURL=agentupdaterequest.d.ts.map