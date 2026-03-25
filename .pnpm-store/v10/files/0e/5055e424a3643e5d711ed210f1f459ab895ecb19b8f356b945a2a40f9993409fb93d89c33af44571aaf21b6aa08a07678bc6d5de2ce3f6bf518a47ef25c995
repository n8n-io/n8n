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
export type AgentsCompletionRequestStop = string | Array<string>;
export type AgentsCompletionRequestMessages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
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
     * The ID of the agent to use for this completion.
     */
    agentId: string;
};
/** @internal */
export declare const AgentsCompletionRequestStop$inboundSchema: z.ZodType<AgentsCompletionRequestStop, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const AgentsCompletionRequestStop$outboundSchema: z.ZodType<AgentsCompletionRequestStop$Outbound, z.ZodTypeDef, AgentsCompletionRequestStop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionRequestStop$ {
    /** @deprecated use `AgentsCompletionRequestStop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionRequestStop, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionRequestStop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionRequestStop$Outbound, z.ZodTypeDef, AgentsCompletionRequestStop>;
    /** @deprecated use `AgentsCompletionRequestStop$Outbound` instead. */
    type Outbound = AgentsCompletionRequestStop$Outbound;
}
export declare function agentsCompletionRequestStopToJSON(agentsCompletionRequestStop: AgentsCompletionRequestStop): string;
export declare function agentsCompletionRequestStopFromJSON(jsonString: string): SafeParseResult<AgentsCompletionRequestStop, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionRequestMessages$inboundSchema: z.ZodType<AgentsCompletionRequestMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionRequestMessages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const AgentsCompletionRequestMessages$outboundSchema: z.ZodType<AgentsCompletionRequestMessages$Outbound, z.ZodTypeDef, AgentsCompletionRequestMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionRequestMessages$ {
    /** @deprecated use `AgentsCompletionRequestMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionRequestMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionRequestMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionRequestMessages$Outbound, z.ZodTypeDef, AgentsCompletionRequestMessages>;
    /** @deprecated use `AgentsCompletionRequestMessages$Outbound` instead. */
    type Outbound = AgentsCompletionRequestMessages$Outbound;
}
export declare function agentsCompletionRequestMessagesToJSON(agentsCompletionRequestMessages: AgentsCompletionRequestMessages): string;
export declare function agentsCompletionRequestMessagesFromJSON(jsonString: string): SafeParseResult<AgentsCompletionRequestMessages, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionRequestToolChoice$inboundSchema: z.ZodType<AgentsCompletionRequestToolChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const AgentsCompletionRequestToolChoice$outboundSchema: z.ZodType<AgentsCompletionRequestToolChoice$Outbound, z.ZodTypeDef, AgentsCompletionRequestToolChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionRequestToolChoice$ {
    /** @deprecated use `AgentsCompletionRequestToolChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionRequestToolChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionRequestToolChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionRequestToolChoice$Outbound, z.ZodTypeDef, AgentsCompletionRequestToolChoice>;
    /** @deprecated use `AgentsCompletionRequestToolChoice$Outbound` instead. */
    type Outbound = AgentsCompletionRequestToolChoice$Outbound;
}
export declare function agentsCompletionRequestToolChoiceToJSON(agentsCompletionRequestToolChoice: AgentsCompletionRequestToolChoice): string;
export declare function agentsCompletionRequestToolChoiceFromJSON(jsonString: string): SafeParseResult<AgentsCompletionRequestToolChoice, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionRequest$inboundSchema: z.ZodType<AgentsCompletionRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionRequest$Outbound = {
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
    agent_id: string;
};
/** @internal */
export declare const AgentsCompletionRequest$outboundSchema: z.ZodType<AgentsCompletionRequest$Outbound, z.ZodTypeDef, AgentsCompletionRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionRequest$ {
    /** @deprecated use `AgentsCompletionRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionRequest$Outbound, z.ZodTypeDef, AgentsCompletionRequest>;
    /** @deprecated use `AgentsCompletionRequest$Outbound` instead. */
    type Outbound = AgentsCompletionRequest$Outbound;
}
export declare function agentsCompletionRequestToJSON(agentsCompletionRequest: AgentsCompletionRequest): string;
export declare function agentsCompletionRequestFromJSON(jsonString: string): SafeParseResult<AgentsCompletionRequest, SDKValidationError>;
//# sourceMappingURL=agentscompletionrequest.d.ts.map