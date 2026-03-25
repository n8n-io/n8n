import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CodeInterpreterTool, CodeInterpreterTool$Outbound } from "./codeinterpretertool.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { DocumentLibraryTool, DocumentLibraryTool$Outbound } from "./documentlibrarytool.js";
import { FunctionTool, FunctionTool$Outbound } from "./functiontool.js";
import { ImageGenerationTool, ImageGenerationTool$Outbound } from "./imagegenerationtool.js";
import { WebSearchPremiumTool, WebSearchPremiumTool$Outbound } from "./websearchpremiumtool.js";
import { WebSearchTool, WebSearchTool$Outbound } from "./websearchtool.js";
export type AgentTools = (DocumentLibraryTool & {
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
export declare const AgentObject: {
    readonly Agent: "agent";
};
export type AgentObject = ClosedEnum<typeof AgentObject>;
export type Agent = {
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
    object?: AgentObject | undefined;
    id: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};
/** @internal */
export declare const AgentTools$inboundSchema: z.ZodType<AgentTools, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentTools$Outbound = (DocumentLibraryTool$Outbound & {
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
export declare const AgentTools$outboundSchema: z.ZodType<AgentTools$Outbound, z.ZodTypeDef, AgentTools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentTools$ {
    /** @deprecated use `AgentTools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentTools, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentTools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentTools$Outbound, z.ZodTypeDef, AgentTools>;
    /** @deprecated use `AgentTools$Outbound` instead. */
    type Outbound = AgentTools$Outbound;
}
export declare function agentToolsToJSON(agentTools: AgentTools): string;
export declare function agentToolsFromJSON(jsonString: string): SafeParseResult<AgentTools, SDKValidationError>;
/** @internal */
export declare const AgentObject$inboundSchema: z.ZodNativeEnum<typeof AgentObject>;
/** @internal */
export declare const AgentObject$outboundSchema: z.ZodNativeEnum<typeof AgentObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentObject$ {
    /** @deprecated use `AgentObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Agent: "agent";
    }>;
    /** @deprecated use `AgentObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Agent: "agent";
    }>;
}
/** @internal */
export declare const Agent$inboundSchema: z.ZodType<Agent, z.ZodTypeDef, unknown>;
/** @internal */
export type Agent$Outbound = {
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
    object: string;
    id: string;
    version: number;
    created_at: string;
    updated_at: string;
};
/** @internal */
export declare const Agent$outboundSchema: z.ZodType<Agent$Outbound, z.ZodTypeDef, Agent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Agent$ {
    /** @deprecated use `Agent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Agent, z.ZodTypeDef, unknown>;
    /** @deprecated use `Agent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Agent$Outbound, z.ZodTypeDef, Agent>;
    /** @deprecated use `Agent$Outbound` instead. */
    type Outbound = Agent$Outbound;
}
export declare function agentToJSON(agent: Agent): string;
export declare function agentFromJSON(jsonString: string): SafeParseResult<Agent, SDKValidationError>;
//# sourceMappingURL=agent.d.ts.map