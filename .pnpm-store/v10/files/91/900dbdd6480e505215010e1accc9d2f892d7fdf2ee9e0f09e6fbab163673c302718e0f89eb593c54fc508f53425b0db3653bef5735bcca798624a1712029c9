import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { MistralPromptMode } from "./mistralpromptmode.js";
import { Prediction, Prediction$Outbound } from "./prediction.js";
import { ResponseFormat, ResponseFormat$Outbound } from "./responseformat.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { Tool, Tool$Outbound } from "./tool.js";
import { ToolChoice, ToolChoice$Outbound } from "./toolchoice.js";
import { ToolChoiceEnum } from "./toolchoiceenum.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
/**
 * Stop generation if this token is detected. Or if one of these tokens is detected when providing an array
 */
export type ChatCompletionStreamRequestStop = string | Array<string>;
export type ChatCompletionStreamRequestMessages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type ChatCompletionStreamRequestToolChoice = ToolChoice | ToolChoiceEnum;
export type ChatCompletionStreamRequest = {
    /**
     * ID of the model to use. You can use the [List Available Models](/api/#tag/models/operation/list_models_v1_models_get) API to see all of your available models, or see our [Model overview](/models) for model descriptions.
     */
    model: string;
    /**
     * What sampling temperature to use, we recommend between 0.0 and 0.7. Higher values like 0.7 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or `top_p` but not both. The default value varies depending on the model you are targeting. Call the `/models` endpoint to retrieve the appropriate value.
     */
    temperature?: number | null | undefined;
    /**
     * Nucleus sampling, where the model considers the results of the tokens with `top_p` probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or `temperature` but not both.
     */
    topP?: number | undefined;
    /**
     * The maximum number of tokens to generate in the completion. The token count of your prompt plus `max_tokens` cannot exceed the model's context length.
     */
    maxTokens?: number | null | undefined;
    stream?: boolean | undefined;
    /**
     * Stop generation if this token is detected. Or if one of these tokens is detected when providing an array
     */
    stop?: string | Array<string> | undefined;
    /**
     * The seed to use for random sampling. If set, different calls will generate deterministic results.
     */
    randomSeed?: number | null | undefined;
    /**
     * The prompt(s) to generate completions for, encoded as a list of dict with role and content.
     */
    messages: Array<(SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    }) | (AssistantMessage & {
        role: "assistant";
    })>;
    responseFormat?: ResponseFormat | undefined;
    tools?: Array<Tool> | null | undefined;
    toolChoice?: ToolChoice | ToolChoiceEnum | undefined;
    /**
     * presence_penalty determines how much the model penalizes the repetition of words or phrases. A higher presence penalty encourages the model to use a wider variety of words and phrases, making the output more diverse and creative.
     */
    presencePenalty?: number | undefined;
    /**
     * frequency_penalty penalizes the repetition of words based on their frequency in the generated text. A higher frequency penalty discourages the model from repeating words that have already appeared frequently in the output, promoting diversity and reducing repetition.
     */
    frequencyPenalty?: number | undefined;
    /**
     * Number of completions to return for each request, input tokens are only billed once.
     */
    n?: number | null | undefined;
    prediction?: Prediction | undefined;
    parallelToolCalls?: boolean | undefined;
    /**
     * Allows toggling between the reasoning mode and no system prompt. When set to `reasoning` the system prompt for reasoning models will be used.
     */
    promptMode?: MistralPromptMode | null | undefined;
    /**
     * Whether to inject a safety prompt before all conversations.
     */
    safePrompt?: boolean | undefined;
};
/** @internal */
export declare const ChatCompletionStreamRequestStop$inboundSchema: z.ZodType<ChatCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionStreamRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const ChatCompletionStreamRequestStop$outboundSchema: z.ZodType<ChatCompletionStreamRequestStop$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestStop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionStreamRequestStop$ {
    /** @deprecated use `ChatCompletionStreamRequestStop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionStreamRequestStop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionStreamRequestStop$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestStop>;
    /** @deprecated use `ChatCompletionStreamRequestStop$Outbound` instead. */
    type Outbound = ChatCompletionStreamRequestStop$Outbound;
}
export declare function chatCompletionStreamRequestStopToJSON(chatCompletionStreamRequestStop: ChatCompletionStreamRequestStop): string;
export declare function chatCompletionStreamRequestStopFromJSON(jsonString: string): SafeParseResult<ChatCompletionStreamRequestStop, SDKValidationError>;
/** @internal */
export declare const ChatCompletionStreamRequestMessages$inboundSchema: z.ZodType<ChatCompletionStreamRequestMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionStreamRequestMessages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const ChatCompletionStreamRequestMessages$outboundSchema: z.ZodType<ChatCompletionStreamRequestMessages$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionStreamRequestMessages$ {
    /** @deprecated use `ChatCompletionStreamRequestMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionStreamRequestMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionStreamRequestMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionStreamRequestMessages$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestMessages>;
    /** @deprecated use `ChatCompletionStreamRequestMessages$Outbound` instead. */
    type Outbound = ChatCompletionStreamRequestMessages$Outbound;
}
export declare function chatCompletionStreamRequestMessagesToJSON(chatCompletionStreamRequestMessages: ChatCompletionStreamRequestMessages): string;
export declare function chatCompletionStreamRequestMessagesFromJSON(jsonString: string): SafeParseResult<ChatCompletionStreamRequestMessages, SDKValidationError>;
/** @internal */
export declare const ChatCompletionStreamRequestToolChoice$inboundSchema: z.ZodType<ChatCompletionStreamRequestToolChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionStreamRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const ChatCompletionStreamRequestToolChoice$outboundSchema: z.ZodType<ChatCompletionStreamRequestToolChoice$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestToolChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionStreamRequestToolChoice$ {
    /** @deprecated use `ChatCompletionStreamRequestToolChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionStreamRequestToolChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionStreamRequestToolChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionStreamRequestToolChoice$Outbound, z.ZodTypeDef, ChatCompletionStreamRequestToolChoice>;
    /** @deprecated use `ChatCompletionStreamRequestToolChoice$Outbound` instead. */
    type Outbound = ChatCompletionStreamRequestToolChoice$Outbound;
}
export declare function chatCompletionStreamRequestToolChoiceToJSON(chatCompletionStreamRequestToolChoice: ChatCompletionStreamRequestToolChoice): string;
export declare function chatCompletionStreamRequestToolChoiceFromJSON(jsonString: string): SafeParseResult<ChatCompletionStreamRequestToolChoice, SDKValidationError>;
/** @internal */
export declare const ChatCompletionStreamRequest$inboundSchema: z.ZodType<ChatCompletionStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionStreamRequest$Outbound = {
    model: string;
    temperature?: number | null | undefined;
    top_p?: number | undefined;
    max_tokens?: number | null | undefined;
    stream: boolean;
    stop?: string | Array<string> | undefined;
    random_seed?: number | null | undefined;
    messages: Array<(SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    }) | (AssistantMessage$Outbound & {
        role: "assistant";
    })>;
    response_format?: ResponseFormat$Outbound | undefined;
    tools?: Array<Tool$Outbound> | null | undefined;
    tool_choice?: ToolChoice$Outbound | string | undefined;
    presence_penalty?: number | undefined;
    frequency_penalty?: number | undefined;
    n?: number | null | undefined;
    prediction?: Prediction$Outbound | undefined;
    parallel_tool_calls?: boolean | undefined;
    prompt_mode?: string | null | undefined;
    safe_prompt?: boolean | undefined;
};
/** @internal */
export declare const ChatCompletionStreamRequest$outboundSchema: z.ZodType<ChatCompletionStreamRequest$Outbound, z.ZodTypeDef, ChatCompletionStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionStreamRequest$ {
    /** @deprecated use `ChatCompletionStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionStreamRequest$Outbound, z.ZodTypeDef, ChatCompletionStreamRequest>;
    /** @deprecated use `ChatCompletionStreamRequest$Outbound` instead. */
    type Outbound = ChatCompletionStreamRequest$Outbound;
}
export declare function chatCompletionStreamRequestToJSON(chatCompletionStreamRequest: ChatCompletionStreamRequest): string;
export declare function chatCompletionStreamRequestFromJSON(jsonString: string): SafeParseResult<ChatCompletionStreamRequest, SDKValidationError>;
//# sourceMappingURL=chatcompletionstreamrequest.d.ts.map