import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CodeInterpreterTool, CodeInterpreterTool$Outbound } from "./codeinterpretertool.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { DocumentLibraryTool, DocumentLibraryTool$Outbound } from "./documentlibrarytool.js";
import { FunctionTool, FunctionTool$Outbound } from "./functiontool.js";
import { ImageGenerationTool, ImageGenerationTool$Outbound } from "./imagegenerationtool.js";
import { WebSearchPremiumTool, WebSearchPremiumTool$Outbound } from "./websearchpremiumtool.js";
import { WebSearchTool, WebSearchTool$Outbound } from "./websearchtool.js";
export declare const HandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type HandoffExecution = ClosedEnum<typeof HandoffExecution>;
export type Tools = (DocumentLibraryTool & {
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
export type ConversationRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    store?: boolean | null | undefined;
    handoffExecution?: HandoffExecution | null | undefined;
    instructions?: string | null | undefined;
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
    })> | null | undefined;
    completionArgs?: CompletionArgs | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    agentId?: string | null | undefined;
    model?: string | null | undefined;
};
/** @internal */
export declare const HandoffExecution$inboundSchema: z.ZodNativeEnum<typeof HandoffExecution>;
/** @internal */
export declare const HandoffExecution$outboundSchema: z.ZodNativeEnum<typeof HandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace HandoffExecution$ {
    /** @deprecated use `HandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `HandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const Tools$inboundSchema: z.ZodType<Tools, z.ZodTypeDef, unknown>;
/** @internal */
export type Tools$Outbound = (DocumentLibraryTool$Outbound & {
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
export declare const Tools$outboundSchema: z.ZodType<Tools$Outbound, z.ZodTypeDef, Tools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Tools$ {
    /** @deprecated use `Tools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Tools, z.ZodTypeDef, unknown>;
    /** @deprecated use `Tools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Tools$Outbound, z.ZodTypeDef, Tools>;
    /** @deprecated use `Tools$Outbound` instead. */
    type Outbound = Tools$Outbound;
}
export declare function toolsToJSON(tools: Tools): string;
export declare function toolsFromJSON(jsonString: string): SafeParseResult<Tools, SDKValidationError>;
/** @internal */
export declare const ConversationRequest$inboundSchema: z.ZodType<ConversationRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store?: boolean | null | undefined;
    handoff_execution?: string | null | undefined;
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
    })> | null | undefined;
    completion_args?: CompletionArgs$Outbound | null | undefined;
    name?: string | null | undefined;
    description?: string | null | undefined;
    agent_id?: string | null | undefined;
    model?: string | null | undefined;
};
/** @internal */
export declare const ConversationRequest$outboundSchema: z.ZodType<ConversationRequest$Outbound, z.ZodTypeDef, ConversationRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationRequest$ {
    /** @deprecated use `ConversationRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationRequest$Outbound, z.ZodTypeDef, ConversationRequest>;
    /** @deprecated use `ConversationRequest$Outbound` instead. */
    type Outbound = ConversationRequest$Outbound;
}
export declare function conversationRequestToJSON(conversationRequest: ConversationRequest): string;
export declare function conversationRequestFromJSON(jsonString: string): SafeParseResult<ConversationRequest, SDKValidationError>;
//# sourceMappingURL=conversationrequest.d.ts.map