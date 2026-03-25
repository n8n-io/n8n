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
export declare const ConversationStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationStreamRequestHandoffExecution = ClosedEnum<typeof ConversationStreamRequestHandoffExecution>;
export type ConversationStreamRequestTools = (DocumentLibraryTool & {
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
export type ConversationStreamRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    store?: boolean | null | undefined;
    handoffExecution?: ConversationStreamRequestHandoffExecution | null | undefined;
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
export declare const ConversationStreamRequestHandoffExecution$inboundSchema: z.ZodNativeEnum<typeof ConversationStreamRequestHandoffExecution>;
/** @internal */
export declare const ConversationStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationStreamRequestHandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationStreamRequestHandoffExecution$ {
    /** @deprecated use `ConversationStreamRequestHandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `ConversationStreamRequestHandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const ConversationStreamRequestTools$inboundSchema: z.ZodType<ConversationStreamRequestTools, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationStreamRequestTools$Outbound = (DocumentLibraryTool$Outbound & {
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
export declare const ConversationStreamRequestTools$outboundSchema: z.ZodType<ConversationStreamRequestTools$Outbound, z.ZodTypeDef, ConversationStreamRequestTools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationStreamRequestTools$ {
    /** @deprecated use `ConversationStreamRequestTools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationStreamRequestTools, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationStreamRequestTools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationStreamRequestTools$Outbound, z.ZodTypeDef, ConversationStreamRequestTools>;
    /** @deprecated use `ConversationStreamRequestTools$Outbound` instead. */
    type Outbound = ConversationStreamRequestTools$Outbound;
}
export declare function conversationStreamRequestToolsToJSON(conversationStreamRequestTools: ConversationStreamRequestTools): string;
export declare function conversationStreamRequestToolsFromJSON(jsonString: string): SafeParseResult<ConversationStreamRequestTools, SDKValidationError>;
/** @internal */
export declare const ConversationStreamRequest$inboundSchema: z.ZodType<ConversationStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationStreamRequest$Outbound = {
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
export declare const ConversationStreamRequest$outboundSchema: z.ZodType<ConversationStreamRequest$Outbound, z.ZodTypeDef, ConversationStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationStreamRequest$ {
    /** @deprecated use `ConversationStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationStreamRequest$Outbound, z.ZodTypeDef, ConversationStreamRequest>;
    /** @deprecated use `ConversationStreamRequest$Outbound` instead. */
    type Outbound = ConversationStreamRequest$Outbound;
}
export declare function conversationStreamRequestToJSON(conversationStreamRequest: ConversationStreamRequest): string;
export declare function conversationStreamRequestFromJSON(jsonString: string): SafeParseResult<ConversationStreamRequest, SDKValidationError>;
//# sourceMappingURL=conversationstreamrequest.d.ts.map