import { ChatCompletionRequest, ChatCompletionRequestToolChoice, Messages } from "@mistralai/mistralai/models/components/chatcompletionrequest.js";
import { Tool } from "@mistralai/mistralai/models/components/tool.js";
import { ToolCall } from "@mistralai/mistralai/models/components/toolcall.js";
import { ChatCompletionStreamRequest } from "@mistralai/mistralai/models/components/chatcompletionstreamrequest.js";
import { CompletionEvent } from "@mistralai/mistralai/models/components/completionevent.js";
import { ChatCompletionResponse } from "@mistralai/mistralai/models/components/chatcompletionresponse.js";
import { BeforeRequestHook, HTTPClient, RequestErrorHook, ResponseHook } from "@mistralai/mistralai/lib/http.js";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { BaseLanguageModelCallOptions, BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseChatModel, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";

//#region src/chat_models.d.ts
type ChatMistralAIToolType = ToolCall | Tool | BindToolsInput;
interface ChatMistralAICallOptions extends Omit<BaseLanguageModelCallOptions, "stop"> {
  response_format?: {
    type: "text" | "json_object";
  };
  tools?: ChatMistralAIToolType[];
  tool_choice?: ChatCompletionRequestToolChoice;
  /**
   * Whether or not to include token usage in the stream.
   * @default {true}
   */
  streamUsage?: boolean;
}
/**
 * Input to chat model class.
 */
interface ChatMistralAIInput extends BaseChatModelParams, Pick<ChatMistralAICallOptions, "streamUsage"> {
  /**
   * The API key to use.
   * @default {process.env.MISTRAL_API_KEY}
   */
  apiKey?: string;
  /**
   * The name of the model to use.
   * Alias for `model`
   * @deprecated Use `model` instead.
   * @default {"mistral-small-latest"}
   */
  modelName?: string;
  /**
   * The name of the model to use.
   * @default {"mistral-small-latest"}
   */
  model?: string;
  /**
   * Override the default server URL used by the Mistral SDK.
   * @deprecated use serverURL instead
   */
  endpoint?: string;
  /**
   * Override the default server URL used by the Mistral SDK.
   */
  serverURL?: string;
  /**
   * What sampling temperature to use, between 0.0 and 2.0.
   * Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   * @default {0.7}
   */
  temperature?: number;
  /**
   * Nucleus sampling, where the model considers the results of the tokens with `top_p` probability mass.
   * So 0.1 means only the tokens comprising the top 10% probability mass are considered.
   * Should be between 0 and 1.
   * @default {1}
   */
  topP?: number;
  /**
   * The maximum number of tokens to generate in the completion.
   * The token count of your prompt plus max_tokens cannot exceed the model's context length.
   */
  maxTokens?: number;
  /**
   * Whether or not to stream the response.
   * @default {false}
   */
  streaming?: boolean;
  /**
   * Whether to inject a safety prompt before all conversations.
   * @default {false}
   * @deprecated use safePrompt instead
   */
  safeMode?: boolean;
  /**
   * Whether to inject a safety prompt before all conversations.
   * @default {false}
   */
  safePrompt?: boolean;
  /**
   * The seed to use for random sampling. If set, different calls will generate deterministic results.
   * Alias for `seed`
   */
  randomSeed?: number;
  /**
   * The seed to use for random sampling. If set, different calls will generate deterministic results.
   */
  seed?: number;
  /**
   * A list of custom hooks that must follow (req: Request) => Awaitable<Request | void>
   * They are automatically added when a ChatMistralAI instance is created.
   */
  beforeRequestHooks?: BeforeRequestHook[];
  /**
   * A list of custom hooks that must follow (err: unknown, req: Request) => Awaitable<void>.
   * They are automatically added when a ChatMistralAI instance is created.
   */
  requestErrorHooks?: RequestErrorHook[];
  /**
   * A list of custom hooks that must follow (res: Response, req: Request) => Awaitable<void>.
   * They are automatically added when a ChatMistralAI instance is created.
   */
  responseHooks?: ResponseHook[];
  /**
   * Custom HTTP client to manage API requests.
   * Allows users to add custom fetch implementations, hooks, as well as error and response processing.
   */
  httpClient?: HTTPClient;
  /**
   * Determines how much the model penalizes the repetition of words or phrases. A higher presence
   * penalty encourages the model to use a wider variety of words and phrases, making the output
   * more diverse and creative.
   */
  presencePenalty?: number;
  /**
   * Penalizes the repetition of words based on their frequency in the generated text. A higher
   * frequency penalty discourages the model from repeating words that have already appeared frequently
   * in the output, promoting diversity and reducing repetition.
   */
  frequencyPenalty?: number;
  /**
   * Number of completions to return for each request, input tokens are only billed once.
   */
  numCompletions?: number;
}
declare function convertMessagesToMistralMessages(messages: Array<BaseMessage>): Array<Messages>;
/**
 * Mistral AI chat model integration.
 *
 * Setup:
 * Install `@langchain/mistralai` and set an environment variable named `MISTRAL_API_KEY`.
 *
 * ```bash
 * npm install @langchain/mistralai
 * export MISTRAL_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_mistralai.ChatMistralAI.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/_langchain_mistralai.ChatMistralAICallOptions.html)
 *
 * Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
 * They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
 *
 * ```typescript
 * // When calling `.withConfig`, call options should be passed via the first argument
 * const llmWithArgsBound = llm.bindTools([...]) // tools array
 *   .withConfig({
 *     stop: ["\n"], // other call options
 *   });
 *
 * // You can also bind tools and call options like this
 * const llmWithTools = llm.bindTools([...], {
 *   tool_choice: "auto",
 * });
 * ```
 *
 * ## Examples
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { ChatMistralAI } from '@langchain/mistralai';
 *
 * const llm = new ChatMistralAI({
 *   model: "mistral-large-2402",
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
 *   "content": "The translation of \"I love programming\" into French is \"J'aime la programmation\". Here's the breakdown:\n\n- \"I\" translates to \"Je\"\n- \"love\" translates to \"aime\"\n- \"programming\" translates to \"la programmation\"\n\nSo, \"J'aime la programmation\" means \"I love programming\" in French.",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "tokenUsage": {
 *       "completionTokens": 89,
 *       "promptTokens": 13,
 *       "totalTokens": 102
 *     },
 *     "finish_reason": "stop"
 *   },
 *   "tool_calls": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 13,
 *     "output_tokens": 89,
 *     "total_tokens": 102
 *   }
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
 *   "content": "The",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " translation",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " of",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " \"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "I",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *  "content": ".",
 *  "additional_kwargs": {},
 *  "response_metadata": {
 *    "prompt": 0,
 *    "completion": 0
 *  },
 *  "tool_calls": [],
 *  "tool_call_chunks": [],
 *  "invalid_tool_calls": []
 *}
 *AIMessageChunk {
 *  "content": "",
 *  "additional_kwargs": {},
 *  "response_metadata": {
 *    "prompt": 0,
 *    "completion": 0
 *  },
 *  "tool_calls": [],
 *  "tool_call_chunks": [],
 *  "invalid_tool_calls": [],
 *  "usage_metadata": {
 *    "input_tokens": 13,
 *    "output_tokens": 89,
 *    "total_tokens": 102
 *  }
 *}
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
 *   "content": "The translation of \"I love programming\" into French is \"J'aime la programmation\". Here's the breakdown:\n\n- \"I\" translates to \"Je\"\n- \"love\" translates to \"aime\"\n- \"programming\" translates to \"la programmation\"\n\nSo, \"J'aime la programmation\" means \"I love programming\" in French.",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 13,
 *     "output_tokens": 89,
 *     "total_tokens": 102
 *   }
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
 * const llmWithTools = llm.bindTools([GetWeather, GetPopulation]);
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
 *     id: '47i216yko'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'nb3v8Fpcn'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'EedWzByIB'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'jLdLia7zC'
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
 * const structuredLlm = llm.withStructuredOutput(Joke, { name: "Joke" });
 * const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
 * console.log(jokeResult);
 * ```
 *
 * ```txt
 * {
 *   setup: "Why don't cats play poker in the jungle?",
 *   punchline: 'Too many cheetahs!',
 *   rating: 7
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Usage Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForMetadata = await llm.invoke(input);
 * console.log(aiMsgForMetadata.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 13, output_tokens: 89, total_tokens: 102 }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatMistralAI<CallOptions extends ChatMistralAICallOptions = ChatMistralAICallOptions> extends BaseChatModel<CallOptions, AIMessageChunk> implements ChatMistralAIInput {
  // Used for tracing, replace with the same name as your class
  static lc_name(): string;
  lc_namespace: string[];
  model: string;
  apiKey: string;
  /**
   * @deprecated use serverURL instead
   */
  endpoint: string;
  serverURL?: string;
  temperature: number;
  streaming: boolean;
  topP: number;
  maxTokens: number;
  /**
   * @deprecated use safePrompt instead
   */
  safeMode: boolean;
  safePrompt: boolean;
  randomSeed?: number;
  seed?: number;
  maxRetries?: number;
  lc_serializable: boolean;
  streamUsage: boolean;
  beforeRequestHooks?: Array<BeforeRequestHook>;
  requestErrorHooks?: Array<RequestErrorHook>;
  responseHooks?: Array<ResponseHook>;
  httpClient?: HTTPClient;
  presencePenalty?: number;
  frequencyPenalty?: number;
  numCompletions?: number;
  constructor(fields?: ChatMistralAIInput);
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  _llmType(): string;
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options?: this["ParsedCallOptions"]): Omit<ChatCompletionRequest | ChatCompletionStreamRequest, "messages">;
  bindTools(tools: ChatMistralAIToolType[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
  /**
   * Calls the MistralAI API with retry logic in case of failures.
   * @param {ChatRequest} input The input to send to the MistralAI API.
   * @returns {Promise<MistralAIChatCompletionResult | AsyncIterable<MistralAIChatCompletionEvent>>} The response from the MistralAI API.
   */
  completionWithRetry(input: ChatCompletionStreamRequest, streaming: true): Promise<AsyncIterable<CompletionEvent>>;
  completionWithRetry(input: ChatCompletionRequest, streaming: false): Promise<ChatCompletionResponse>;
  /** @ignore */
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  addAllHooksToHttpClient(): void;
  removeAllHooksFromHttpClient(): void;
  removeHookFromHttpClient(hook: BeforeRequestHook | RequestErrorHook | ResponseHook): void;
  /** @ignore */
  _combineLLMOutput(): never[];
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
export { ChatMistralAI, ChatMistralAICallOptions, ChatMistralAIInput, convertMessagesToMistralMessages };
//# sourceMappingURL=chat_models.d.cts.map