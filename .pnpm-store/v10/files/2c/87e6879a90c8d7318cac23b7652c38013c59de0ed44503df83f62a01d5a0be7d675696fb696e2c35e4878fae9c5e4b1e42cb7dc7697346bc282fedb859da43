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
export type Stop = string | Array<string>;
export type Messages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type ChatCompletionRequestToolChoice = ToolChoice | ToolChoiceEnum;
export type ChatCompletionRequest = {
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
    /**
     * Whether to stream back partial progress. If set, tokens will be sent as data-only server-side events as they become available, with the stream terminated by a data: [DONE] message. Otherwise, the server will hold the request open until the timeout or until completion, with the response containing the full result as JSON.
     */
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
export declare const Stop$inboundSchema: z.ZodType<Stop, z.ZodTypeDef, unknown>;
/** @internal */
export type Stop$Outbound = string | Array<string>;
/** @internal */
export declare const Stop$outboundSchema: z.ZodType<Stop$Outbound, z.ZodTypeDef, Stop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Stop$ {
    /** @deprecated use `Stop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Stop, z.ZodTypeDef, unknown>;
    /** @deprecated use `Stop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Stop$Outbound, z.ZodTypeDef, Stop>;
    /** @deprecated use `Stop$Outbound` instead. */
    type Outbound = Stop$Outbound;
}
export declare function stopToJSON(stop: Stop): string;
export declare function stopFromJSON(jsonString: string): SafeParseResult<Stop, SDKValidationError>;
/** @internal */
export declare const Messages$inboundSchema: z.ZodType<Messages, z.ZodTypeDef, unknown>;
/** @internal */
export type Messages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const Messages$outboundSchema: z.ZodType<Messages$Outbound, z.ZodTypeDef, Messages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Messages$ {
    /** @deprecated use `Messages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Messages, z.ZodTypeDef, unknown>;
    /** @deprecated use `Messages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Messages$Outbound, z.ZodTypeDef, Messages>;
    /** @deprecated use `Messages$Outbound` instead. */
    type Outbound = Messages$Outbound;
}
export declare function messagesToJSON(messages: Messages): string;
export declare function messagesFromJSON(jsonString: string): SafeParseResult<Messages, SDKValidationError>;
/** @internal */
export declare const ChatCompletionRequestToolChoice$inboundSchema: z.ZodType<ChatCompletionRequestToolChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const ChatCompletionRequestToolChoice$outboundSchema: z.ZodType<ChatCompletionRequestToolChoice$Outbound, z.ZodTypeDef, ChatCompletionRequestToolChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionRequestToolChoice$ {
    /** @deprecated use `ChatCompletionRequestToolChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionRequestToolChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionRequestToolChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionRequestToolChoice$Outbound, z.ZodTypeDef, ChatCompletionRequestToolChoice>;
    /** @deprecated use `ChatCompletionRequestToolChoice$Outbound` instead. */
    type Outbound = ChatCompletionRequestToolChoice$Outbound;
}
export declare function chatCompletionRequestToolChoiceToJSON(chatCompletionRequestToolChoice: ChatCompletionRequestToolChoice): string;
export declare function chatCompletionRequestToolChoiceFromJSON(jsonString: string): SafeParseResult<ChatCompletionRequestToolChoice, SDKValidationError>;
/** @internal */
export declare const ChatCompletionRequest$inboundSchema: z.ZodType<ChatCompletionRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatCompletionRequest$Outbound = {
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
export declare const ChatCompletionRequest$outboundSchema: z.ZodType<ChatCompletionRequest$Outbound, z.ZodTypeDef, ChatCompletionRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatCompletionRequest$ {
    /** @deprecated use `ChatCompletionRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatCompletionRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatCompletionRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatCompletionRequest$Outbound, z.ZodTypeDef, ChatCompletionRequest>;
    /** @deprecated use `ChatCompletionRequest$Outbound` instead. */
    type Outbound = ChatCompletionRequest$Outbound;
}
export declare function chatCompletionRequestToJSON(chatCompletionRequest: ChatCompletionRequest): string;
export declare function chatCompletionRequestFromJSON(jsonString: string): SafeParseResult<ChatCompletionRequest, SDKValidationError>;
//# sourceMappingURL=chatcompletionrequest.d.ts.map