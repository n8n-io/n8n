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
export type AgentsCompletionRequestStop = string | Array<string>;
export type AgentsCompletionRequestMessages = (AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
});
export type AgentsCompletionRequestToolChoice = ToolChoice | ToolChoiceEnum;
export type AgentsCompletionRequest = {
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
    tools?: Array<Tool> | null | undefined;
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
    parallelToolCalls?: boolean | undefined;
    /**
     * Allows toggling between the reasoning mode and no system prompt. When set to `reasoning` the system prompt for reasoning models will be used.
     */
    promptMode?: MistralPromptMode | null | undefined;
    /**
     * The ID of the agent to use for this completion.
     */
    agentId: string;
};
/** @internal */
export type AgentsCompletionRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const AgentsCompletionRequestStop$outboundSchema: z.ZodType<AgentsCompletionRequestStop$Outbound, z.ZodTypeDef, AgentsCompletionRequestStop>;
export declare function agentsCompletionRequestStopToJSON(agentsCompletionRequestStop: AgentsCompletionRequestStop): string;
/** @internal */
export type AgentsCompletionRequestMessages$Outbound = (AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
});
/** @internal */
export declare const AgentsCompletionRequestMessages$outboundSchema: z.ZodType<AgentsCompletionRequestMessages$Outbound, z.ZodTypeDef, AgentsCompletionRequestMessages>;
export declare function agentsCompletionRequestMessagesToJSON(agentsCompletionRequestMessages: AgentsCompletionRequestMessages): string;
/** @internal */
export type AgentsCompletionRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const AgentsCompletionRequestToolChoice$outboundSchema: z.ZodType<AgentsCompletionRequestToolChoice$Outbound, z.ZodTypeDef, AgentsCompletionRequestToolChoice>;
export declare function agentsCompletionRequestToolChoiceToJSON(agentsCompletionRequestToolChoice: AgentsCompletionRequestToolChoice): string;
/** @internal */
export type AgentsCompletionRequest$Outbound = {
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
    agent_id: string;
};
/** @internal */
export declare const AgentsCompletionRequest$outboundSchema: z.ZodType<AgentsCompletionRequest$Outbound, z.ZodTypeDef, AgentsCompletionRequest>;
export declare function agentsCompletionRequestToJSON(agentsCompletionRequest: AgentsCompletionRequest): string;
//# sourceMappingURL=agentscompletionrequest.d.ts.map