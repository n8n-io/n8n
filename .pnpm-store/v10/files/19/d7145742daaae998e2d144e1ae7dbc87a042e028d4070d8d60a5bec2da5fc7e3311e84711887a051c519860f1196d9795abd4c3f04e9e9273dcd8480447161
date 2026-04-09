import * as z from "zod/v3";
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
export type Messages = (AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
});
/**
 * Controls which (if any) tool is called by the model. `none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `any` or `required` means the model must call one or more tools. Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
 */
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
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    /**
     * The prompt(s) to generate completions for, encoded as a list of dict with role and content.
     */
    messages: Array<(AssistantMessage & {
        role: "assistant";
    }) | (SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    })>;
    /**
     * Specify the format that the model must output. By default it will use `{ "type": "text" }`. Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is in JSON. When using JSON mode you MUST also instruct the model to produce JSON yourself with a system or a user message. Setting to `{ "type": "json_schema" }` enables JSON schema mode, which guarantees the message the model generates is in JSON and follows the schema you provide.
     */
    responseFormat?: ResponseFormat | undefined;
    /**
     * A list of tools the model may call. Use this to provide a list of functions the model may generate JSON inputs for.
     */
    tools?: Array<Tool> | null | undefined;
    /**
     * Controls which (if any) tool is called by the model. `none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `any` or `required` means the model must call one or more tools. Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool.
     */
    toolChoice?: ToolChoice | ToolChoiceEnum | undefined;
    /**
     * The `presence_penalty` determines how much the model penalizes the repetition of words or phrases. A higher presence penalty encourages the model to use a wider variety of words and phrases, making the output more diverse and creative.
     */
    presencePenalty?: number | undefined;
    /**
     * The `frequency_penalty` penalizes the repetition of words based on their frequency in the generated text. A higher frequency penalty discourages the model from repeating words that have already appeared frequently in the output, promoting diversity and reducing repetition.
     */
    frequencyPenalty?: number | undefined;
    /**
     * Number of completions to return for each request, input tokens are only billed once.
     */
    n?: number | null | undefined;
    /**
     * Enable users to specify an expected completion, optimizing response times by leveraging known or predictable content.
     */
    prediction?: Prediction | undefined;
    /**
     * Whether to enable parallel function calling during tool use, when enabled the model can call multiple tools in parallel.
     */
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
export type Stop$Outbound = string | Array<string>;
/** @internal */
export declare const Stop$outboundSchema: z.ZodType<Stop$Outbound, z.ZodTypeDef, Stop>;
export declare function stopToJSON(stop: Stop): string;
/** @internal */
export type Messages$Outbound = (AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
});
/** @internal */
export declare const Messages$outboundSchema: z.ZodType<Messages$Outbound, z.ZodTypeDef, Messages>;
export declare function messagesToJSON(messages: Messages): string;
/** @internal */
export type ChatCompletionRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const ChatCompletionRequestToolChoice$outboundSchema: z.ZodType<ChatCompletionRequestToolChoice$Outbound, z.ZodTypeDef, ChatCompletionRequestToolChoice>;
export declare function chatCompletionRequestToolChoiceToJSON(chatCompletionRequestToolChoice: ChatCompletionRequestToolChoice): string;
/** @internal */
export type ChatCompletionRequest$Outbound = {
    model: string;
    temperature?: number | null | undefined;
    top_p?: number | undefined;
    max_tokens?: number | null | undefined;
    stream: boolean;
    stop?: string | Array<string> | undefined;
    random_seed?: number | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    messages: Array<(AssistantMessage$Outbound & {
        role: "assistant";
    }) | (SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
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
export declare function chatCompletionRequestToJSON(chatCompletionRequest: ChatCompletionRequest): string;
//# sourceMappingURL=chatcompletionrequest.d.ts.map