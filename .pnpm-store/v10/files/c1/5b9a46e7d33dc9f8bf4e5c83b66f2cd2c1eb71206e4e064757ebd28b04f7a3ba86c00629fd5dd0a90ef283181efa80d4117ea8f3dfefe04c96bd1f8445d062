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
export type ModelConversationTools = (DocumentLibraryTool & {
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
export declare const ModelConversationObject: {
    readonly Conversation: "conversation";
};
export type ModelConversationObject = ClosedEnum<typeof ModelConversationObject>;
export type ModelConversation = {
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
    /**
     * Name given to the conversation.
     */
    name?: string | null | undefined;
    /**
     * Description of the what the conversation is about.
     */
    description?: string | null | undefined;
    object?: ModelConversationObject | undefined;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    model: string;
};
/** @internal */
export declare const ModelConversationTools$inboundSchema: z.ZodType<ModelConversationTools, z.ZodTypeDef, unknown>;
/** @internal */
export type ModelConversationTools$Outbound = (DocumentLibraryTool$Outbound & {
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
export declare const ModelConversationTools$outboundSchema: z.ZodType<ModelConversationTools$Outbound, z.ZodTypeDef, ModelConversationTools>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelConversationTools$ {
    /** @deprecated use `ModelConversationTools$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModelConversationTools, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModelConversationTools$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModelConversationTools$Outbound, z.ZodTypeDef, ModelConversationTools>;
    /** @deprecated use `ModelConversationTools$Outbound` instead. */
    type Outbound = ModelConversationTools$Outbound;
}
export declare function modelConversationToolsToJSON(modelConversationTools: ModelConversationTools): string;
export declare function modelConversationToolsFromJSON(jsonString: string): SafeParseResult<ModelConversationTools, SDKValidationError>;
/** @internal */
export declare const ModelConversationObject$inboundSchema: z.ZodNativeEnum<typeof ModelConversationObject>;
/** @internal */
export declare const ModelConversationObject$outboundSchema: z.ZodNativeEnum<typeof ModelConversationObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelConversationObject$ {
    /** @deprecated use `ModelConversationObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Conversation: "conversation";
    }>;
    /** @deprecated use `ModelConversationObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Conversation: "conversation";
    }>;
}
/** @internal */
export declare const ModelConversation$inboundSchema: z.ZodType<ModelConversation, z.ZodTypeDef, unknown>;
/** @internal */
export type ModelConversation$Outbound = {
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
    name?: string | null | undefined;
    description?: string | null | undefined;
    object: string;
    id: string;
    created_at: string;
    updated_at: string;
    model: string;
};
/** @internal */
export declare const ModelConversation$outboundSchema: z.ZodType<ModelConversation$Outbound, z.ZodTypeDef, ModelConversation>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelConversation$ {
    /** @deprecated use `ModelConversation$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModelConversation, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModelConversation$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModelConversation$Outbound, z.ZodTypeDef, ModelConversation>;
    /** @deprecated use `ModelConversation$Outbound` instead. */
    type Outbound = ModelConversation$Outbound;
}
export declare function modelConversationToJSON(modelConversation: ModelConversation): string;
export declare function modelConversationFromJSON(jsonString: string): SafeParseResult<ModelConversation, SDKValidationError>;
//# sourceMappingURL=modelconversation.d.ts.map