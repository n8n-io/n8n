import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { InteropZodType } from "@langchain/core/utils/types";
import Groq from "groq-sdk";
import { Runnable } from "@langchain/core/runnables";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import * as ChatCompletionsAPI from "groq-sdk/resources/chat/completions";
import { ChatCompletion, ChatCompletionCreateParams, ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming, ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { RequestOptions } from "groq-sdk/core";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { ModelProfile } from "@langchain/core/language_models/profile";

//#region src/chat_models.d.ts
type ChatGroqToolType = BindToolsInput | ChatCompletionTool;
/**
 * Const list of fields that we'll pick from the `ChatCompletionCreateParams` interface
 * to use as the options allowed to be passed to invocation methods.
 *
 * @internal
 */
declare const CREATE_PARAMS_BASE_CALL_KEYS: readonly ["frequency_penalty", "function_call", "functions", "logit_bias", "logprobs", "max_completion_tokens", "max_tokens", "n", "parallel_tool_calls", "presence_penalty", "reasoning_format", "response_format", "seed", "service_tier", "stop", "temperature", "tool_choice", "top_logprobs", "top_p"];
type ChatGroqCallOptions = Pick<ChatCompletionsAPI.ChatCompletionCreateParamsBase, (typeof CREATE_PARAMS_BASE_CALL_KEYS)[number]> & BaseChatModelCallOptions & {
  /**
   * Additional headers to pass to the API.
   */
  headers?: Record<string, string | null | undefined>;
  /**
   * The index of the prompt in the list of prompts.
   */
  promptIndex?: number;
  /**
   * Additional options to pass to streamed completions.
   * If provided takes precedence over "streamUsage" set at initialization time.
   */
  stream_options?: {
    /**
     * Whether or not to include token usage in the stream.
     * If set to `true`, this will include an additional
     * chunk at the end of the stream with the token usage.
     *
     * Defaults to `true` when streaming, `false` otherwise.
     */
    include_usage: boolean;
  };
  tools?: ChatGroqToolType[];
};
interface ChatGroqInput extends BaseChatModelParams {
  /**
   * The temperature to use for sampling.
   * @default 0.7
   */
  temperature?: number;
  /**
   * The maximum number of tokens that the model can process in a single response.
   * This limits ensures computational efficiency and resource management.
   */
  maxTokens?: number;
  /** Total probability mass of tokens to consider at each step */
  topP?: number;
  /** Penalizes repeated tokens according to frequency */
  frequencyPenalty?: number;
  /** Penalizes repeated tokens */
  presencePenalty?: number;
  /** Number of completions to generate for each prompt */
  n?: number;
  /** Dictionary used to adjust the probability of specific tokens being generated */
  logitBias?: Record<string, number>;
  /** Unique string identifier representing your end-user, which can help OpenAI to monitor and detect abuse. */
  user?: string;
  /**
   * Whether or not to include token usage data in streamed chunks.
   * @default true
   */
  streamUsage?: boolean;
  /**
   * Whether to return log probabilities of the output tokens or not.
   * If true, returns the log probabilities of each output token returned in the content of message.
   */
  logprobs?: boolean;
  /**
   * An integer between 0 and 5 specifying the number of most likely tokens to return at each token position,
   * each with an associated log probability. logprobs must be set to true if this parameter is used.
   */
  topLogprobs?: number;
  /**
   * The Groq API key to use for requests.
   * @default process.env.GROQ_API_KEY
   */
  apiKey?: string;
  /**
   * The name of the model to use.
   */
  model: string;
  /**
   * Up to 4 sequences where the API will stop generating further tokens. The
   * returned text will not contain the stop sequence.
   * Alias for `stopSequences`
   */
  stop?: string | null | Array<string>;
  /**
   * Up to 4 sequences where the API will stop generating further tokens. The
   * returned text will not contain the stop sequence.
   */
  stopSequences?: Array<string>;
  /**
   * Whether or not to stream responses.
   */
  streaming?: boolean;
  /**
   * Override the default base URL for the API
   */
  baseUrl?: string;
  /**
   * The maximum amount of time (in milliseconds) the client will wait for a response
   */
  timeout?: number;
  /**
   * HTTP agent used to manage connections
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpAgent?: any;
  /**
   * Custom fetch function implementation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch?: (...args: any) => any;
  /**
   * Default headers included with every request
   */
  defaultHeaders?: Record<string, string>;
  /**
   * Default query parameters included with every request
   */
  defaultQuery?: Record<string, string>;
}
type GroqRoleEnum = "system" | "assistant" | "user" | "function";
/**
 * Extract the role from a message.
 * @param message - The message to extract the role from.
 * @returns The role of the message.
 */
declare function messageToGroqRole(message: BaseMessage): GroqRoleEnum;
/*
function _oldConvertDeltaToMessageChunk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delta: Record<string, any>,
  rawResponse: ChatCompletionsAPI.ChatCompletionChunk,
  index: number,
  defaultRole: GroqRoleEnum | undefined,
  xGroq?: ChatCompletionsAPI.ChatCompletionChunk.XGroq
): {
  message: BaseMessageChunk;
  toolCallData?: {
    id: string;
    name: string;
    index: number;
    type: "tool_call_chunk";
  }[];
} {
  const { role } = delta;
  const content = delta.content ?? "";
  let additional_kwargs;
  if (delta.function_call) {
    additional_kwargs = {
      function_call: delta.function_call,
    };
  } else if (delta.tool_calls) {
    additional_kwargs = {
      tool_calls: delta.tool_calls,
    };
  } else {
    additional_kwargs = {};
  }

  let usageMetadata: UsageMetadata | undefined;
  let groqMessageId: string | undefined;
  if (xGroq?.usage) {
    usageMetadata = {
      input_tokens: xGroq.usage.prompt_tokens,
      output_tokens: xGroq.usage.completion_tokens,
      total_tokens: xGroq.usage.total_tokens,
    };
    groqMessageId = xGroq.id;
  }

  if (role === "user") {
    return {
      message: new HumanMessageChunk({ content }),
    };
  } else if (role === "assistant") {
    const toolCallChunks = _convertDeltaToolCallToToolCallChunk(
      delta.tool_calls,
      index
    );
    return {
      message: new AIMessageChunk({
        content,
        additional_kwargs,
        tool_call_chunks: toolCallChunks
          ? toolCallChunks.map((tc) => ({
              type: tc.type,
              args: tc.args,
              index: tc.index,
            }))
          : undefined,
        usage_metadata: usageMetadata,
        id: groqMessageId,
      }),
      toolCallData: toolCallChunks
        ? toolCallChunks.map((tc) => ({
            id: tc.id ?? "",
            name: tc.name ?? "",
            index: tc.index ?? index,
            type: "tool_call_chunk",
          }))
        : undefined,
    };
  } else if (role === "system") {
    return {
      message: new SystemMessageChunk({ content }),
    };
  } else {
    return {
      message: new ChatMessageChunk({ content, role }),
    };
  }
}
*/
/**
 * Groq chat model integration.
 *
 * The Groq API is compatible to the OpenAI API with some limitations. View the
 * full API ref at:
 * @link {https://docs.api.groq.com/md/openai.oas.html}
 *
 * Setup:
 * Install `@langchain/groq` and set an environment variable named `GROQ_API_KEY`.
 *
 * ```bash
 * npm install @langchain/groq
 * export GROQ_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_groq.ChatGroq.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_groq.ChatGroqCallOptions.html)
 *
 * Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
 * They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
 *
 * ```typescript
 * // When calling `.withConfig`, call options should be passed via the first argument
 * const llmWithArgsBound = llm.withConfig({
 *   stop: ["\n"],
 * });
 *
 * // When calling `.bindTools`, call options should be passed via the second argument
 * const llmWithTools = llm.bindTools(
 *   [...],
 *   {
 *     tool_choice: "auto",
 *   }
 * );
 * ```
 *
 * ## Examples
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { ChatGroq } from '@langchain/groq';
 *
 * const llm = new ChatGroq({
 *   model: "llama-3.3-70b-versatile",
 *   temperature: 0,
 *   // other params...
 * });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Invoking</strong></summary>
 *
 * ```typescript
 * const input = `Translate "I love programming" into French.`;
 *
 * // Models also accept a list of chat messages or a formatted prompt
 * const result = await llm.invoke(input);
 * console.log(result);
 * ```
 *
 * ```txt
 * AIMessage {
 *   "content": "The French translation of \"I love programming\" is \"J'aime programmer\". In this sentence, \"J'aime\" is the first person singular conjugation of the French verb \"aimer\" which means \"to love\", and \"programmer\" is the French infinitive for \"to program\". I hope this helps! Let me know if you have any other questions.",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "tokenUsage": {
 *       "completionTokens": 82,
 *       "promptTokens": 20,
 *       "totalTokens": 102
 *     },
 *     "finish_reason": "stop"
 *   },
 *   "tool_calls": [],
 *   "invalid_tool_calls": []
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Streaming Chunks</strong></summary>
 *
 * ```typescript
 * for await (const chunk of await llm.stream(input)) {
 *   console.log(chunk);
 * }
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "The",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " French",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " translation",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " of",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " \"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "I",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " love",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * ...
 * AIMessageChunk {
 *   "content": ".",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": "stop"
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Aggregate Streamed Chunks</strong></summary>
 *
 * ```typescript
 * import { AIMessageChunk } from '@langchain/core/messages';
 * import { concat } from '@langchain/core/utils/stream';
 *
 * const stream = await llm.stream(input);
 * let full: AIMessageChunk | undefined;
 * for await (const chunk of stream) {
 *   full = !full ? chunk : concat(full, chunk);
 * }
 * console.log(full);
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "content": "The French translation of \"I love programming\" is \"J'aime programmer\". In this sentence, \"J'aime\" is the first person singular conjugation of the French verb \"aimer\" which means \"to love\", and \"programmer\" is the French infinitive for \"to program\". I hope this helps! Let me know if you have any other questions.",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "finishReason": "stop"
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Bind tools</strong></summary>
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * const llmForToolCalling = new ChatGroq({
 *   model: "llama3-groq-70b-8192-tool-use-preview",
 *   temperature: 0,
 *   // other params...
 * });
 *
 * const GetWeather = {
 *   name: "GetWeather",
 *   description: "Get the current weather in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const GetPopulation = {
 *   name: "GetPopulation",
 *   description: "Get the current population in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const llmWithTools = llmForToolCalling.bindTools([GetWeather, GetPopulation]);
 * const aiMsg = await llmWithTools.invoke(
 *   "Which city is hotter today and which is bigger: LA or NY?"
 * );
 * console.log(aiMsg.tool_calls);
 * ```
 *
 * ```txt
 * [
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'call_cd34'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_68rf'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'call_f81z'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_8byt'
 *   }
 * ]
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Structured Output</strong></summary>
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * const Joke = z.object({
 *   setup: z.string().describe("The setup of the joke"),
 *   punchline: z.string().describe("The punchline to the joke"),
 *   rating: z.number().optional().describe("How funny the joke is, from 1 to 10")
 * }).describe('Joke to tell user.');
 *
 * const structuredLlm = llmForToolCalling.withStructuredOutput(Joke, { name: "Joke" });
 * const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
 * console.log(jokeResult);
 * ```
 *
 * ```txt
 * {
 *   setup: "Why don't cats play poker in the wild?",
 *   punchline: 'Because there are too many cheetahs.'
 * }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatGroq extends BaseChatModel<ChatGroqCallOptions, AIMessageChunk> {
  lc_namespace: string[];
  client: Groq;
  model: string;
  temperature: number;
  stop?: string[];
  stopSequences?: string[];
  maxTokens?: number;
  streaming: boolean;
  apiKey?: string;
  streamUsage: boolean;
  topP: number | null | undefined;
  frequencyPenalty: number | null | undefined;
  presencePenalty: number | null | undefined;
  logprobs: boolean | null | undefined;
  n: number | null | undefined;
  logitBias: Record<string, number> | null | undefined;
  user: string | null | undefined;
  reasoningFormat: ChatCompletionsAPI.ChatCompletionCreateParamsBase["reasoning_format"];
  serviceTier: ChatCompletionsAPI.ChatCompletionCreateParamsBase["service_tier"];
  topLogprobs: number | null | undefined;
  lc_serializable: boolean;
  get lc_serialized_keys(): string[];
  static lc_name(): string;
  _llmType(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get callKeys(): string[];
  constructor(fields: ChatGroqInput);
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  completionWithRetry(request: ChatCompletionCreateParamsStreaming, options?: RequestOptions): Promise<AsyncIterable<ChatCompletionsAPI.ChatCompletionChunk>>;
  completionWithRetry(request: ChatCompletionCreateParamsNonStreaming, options?: RequestOptions): Promise<ChatCompletion>;
  invocationParams(options: this["ParsedCallOptions"], extra?: {
    streaming?: boolean;
  }): Omit<ChatCompletionCreateParams, "messages">;
  bindTools(tools: ChatGroqToolType[], kwargs?: Partial<ChatGroqCallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, ChatGroqCallOptions>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _generateNonStreaming(messages: BaseMessage[], options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  /**
   * Return profiling information for the model.
   *
   * Provides information about the model's capabilities and constraints,
   * including token limits, multimodal support, and advanced features like
   * tool calling and structured output.
   *
   * @returns {ModelProfile} An object describing the model's capabilities and constraints
   *
   * @example
   * ```typescript
   * const model = new ChatGroq({ model: "llama-3.1-8b-instant" });
   * const profile = model.profile;
   * console.log(profile.maxInputTokens); // 128000
   * console.log(profile.imageInputs); // true
   * ```
   */
  get profile(): ModelProfile;
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { ChatGroq, ChatGroqCallOptions, ChatGroqInput, messageToGroqRole };
//# sourceMappingURL=chat_models.d.ts.map