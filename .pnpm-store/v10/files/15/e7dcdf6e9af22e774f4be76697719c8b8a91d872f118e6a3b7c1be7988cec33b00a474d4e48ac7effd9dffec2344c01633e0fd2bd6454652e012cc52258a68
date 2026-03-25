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
export type AgentsCompletionStreamRequestStop = string | Array<string>;
export type AgentsCompletionStreamRequestMessages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type AgentsCompletionStreamRequestToolChoice = ToolChoice | ToolChoiceEnum;
export type AgentsCompletionStreamRequest = {
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
     * The ID of the agent to use for this completion.
     */
    agentId: string;
};
/** @internal */
export declare const AgentsCompletionStreamRequestStop$inboundSchema: z.ZodType<AgentsCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionStreamRequestStop$Outbound = string | Array<string>;
/** @internal */
export declare const AgentsCompletionStreamRequestStop$outboundSchema: z.ZodType<AgentsCompletionStreamRequestStop$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestStop>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionStreamRequestStop$ {
    /** @deprecated use `AgentsCompletionStreamRequestStop$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionStreamRequestStop, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionStreamRequestStop$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionStreamRequestStop$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestStop>;
    /** @deprecated use `AgentsCompletionStreamRequestStop$Outbound` instead. */
    type Outbound = AgentsCompletionStreamRequestStop$Outbound;
}
export declare function agentsCompletionStreamRequestStopToJSON(agentsCompletionStreamRequestStop: AgentsCompletionStreamRequestStop): string;
export declare function agentsCompletionStreamRequestStopFromJSON(jsonString: string): SafeParseResult<AgentsCompletionStreamRequestStop, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionStreamRequestMessages$inboundSchema: z.ZodType<AgentsCompletionStreamRequestMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionStreamRequestMessages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const AgentsCompletionStreamRequestMessages$outboundSchema: z.ZodType<AgentsCompletionStreamRequestMessages$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionStreamRequestMessages$ {
    /** @deprecated use `AgentsCompletionStreamRequestMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionStreamRequestMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionStreamRequestMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionStreamRequestMessages$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestMessages>;
    /** @deprecated use `AgentsCompletionStreamRequestMessages$Outbound` instead. */
    type Outbound = AgentsCompletionStreamRequestMessages$Outbound;
}
export declare function agentsCompletionStreamRequestMessagesToJSON(agentsCompletionStreamRequestMessages: AgentsCompletionStreamRequestMessages): string;
export declare function agentsCompletionStreamRequestMessagesFromJSON(jsonString: string): SafeParseResult<AgentsCompletionStreamRequestMessages, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionStreamRequestToolChoice$inboundSchema: z.ZodType<AgentsCompletionStreamRequestToolChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionStreamRequestToolChoice$Outbound = ToolChoice$Outbound | string;
/** @internal */
export declare const AgentsCompletionStreamRequestToolChoice$outboundSchema: z.ZodType<AgentsCompletionStreamRequestToolChoice$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestToolChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionStreamRequestToolChoice$ {
    /** @deprecated use `AgentsCompletionStreamRequestToolChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionStreamRequestToolChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionStreamRequestToolChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionStreamRequestToolChoice$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequestToolChoice>;
    /** @deprecated use `AgentsCompletionStreamRequestToolChoice$Outbound` instead. */
    type Outbound = AgentsCompletionStreamRequestToolChoice$Outbound;
}
export declare function agentsCompletionStreamRequestToolChoiceToJSON(agentsCompletionStreamRequestToolChoice: AgentsCompletionStreamRequestToolChoice): string;
export declare function agentsCompletionStreamRequestToolChoiceFromJSON(jsonString: string): SafeParseResult<AgentsCompletionStreamRequestToolChoice, SDKValidationError>;
/** @internal */
export declare const AgentsCompletionStreamRequest$inboundSchema: z.ZodType<AgentsCompletionStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsCompletionStreamRequest$Outbound = {
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
export declare const AgentsCompletionStreamRequest$outboundSchema: z.ZodType<AgentsCompletionStreamRequest$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsCompletionStreamRequest$ {
    /** @deprecated use `AgentsCompletionStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsCompletionStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsCompletionStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsCompletionStreamRequest$Outbound, z.ZodTypeDef, AgentsCompletionStreamRequest>;
    /** @deprecated use `AgentsCompletionStreamRequest$Outbound` instead. */
    type Outbound = AgentsCompletionStreamRequest$Outbound;
}
export declare function agentsCompletionStreamRequestToJSON(agentsCompletionStreamRequest: AgentsCompletionStreamRequest): string;
export declare function agentsCompletionStreamRequestFromJSON(jsonString: string): SafeParseResult<AgentsCompletionStreamRequest, SDKValidationError>;
//# sourceMappingURL=agentscompletionstreamrequest.d.ts.map