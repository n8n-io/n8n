import { OllamaCamelCaseOptions } from "./types.js";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { Ollama } from "ollama/browser";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatRequest } from "ollama";

//#region src/chat_models.d.ts
interface ChatOllamaCallOptions extends BaseChatModelCallOptions {
  /**
   * An array of strings to stop on.
   */
  stop?: string[];
  tools?: BindToolsInput[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: string | Record<string, any>;
  /** @deprecated Tool choice is not supported for ChatOllama */
  tool_choice?: never;
}
interface PullModelOptions {
  /**
   * Whether or not to stream the download.
   * @default true
   */
  stream?: boolean;
  insecure?: boolean;
  /**
   * Whether or not to log the status of the download
   * to the console.
   * @default false
   */
  logProgress?: boolean;
}
/**
 * Input to chat model class.
 */
interface ChatOllamaInput extends BaseChatModelParams, OllamaCamelCaseOptions {
  /**
   * The model to invoke. If the model does not exist, it
   * will be pulled.
   * @default "llama3"
   */
  model?: string;
  /**
   * The host URL of the Ollama server.
   * @default "http://127.0.0.1:11434"
   */
  baseUrl?: string;
  /**
   * Optional HTTP Headers to include in the request.
   */
  headers?: Headers | Record<string, string>;
  /**
   * Whether or not to check the model exists on the local machine before
   * invoking it. If set to `true`, the model will be pulled if it does not
   * exist.
   * @default false
   */
  checkOrPullModel?: boolean;
  streaming?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: string | Record<string, any>;
  /**
   * The fetch function to use.
   * @default fetch
   */
  fetch?: typeof fetch;
  think?: boolean;
}
/**
 * Ollama chat model integration.
 *
 * Setup:
 * Install `@langchain/ollama` and the Ollama app.
 *
 * ```bash
 * npm install @langchain/ollama
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_ollama.ChatOllama.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/_langchain_ollama.ChatOllamaCallOptions.html)
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
 *     stop: ["\n"],
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
 * import { ChatOllama } from '@langchain/ollama';
 *
 * const llm = new ChatOllama({
 *   model: "llama-3.1:8b",
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
 *   "content": "The translation of \"I love programming\" into French is:\n\n\"J'adore programmer.\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "model": "llama3.1:8b",
 *     "created_at": "2024-08-12T22:12:23.09468Z",
 *     "done_reason": "stop",
 *     "done": true,
 *     "total_duration": 3715571291,
 *     "load_duration": 35244375,
 *     "prompt_eval_count": 19,
 *     "prompt_eval_duration": 3092116000,
 *     "eval_count": 20,
 *     "eval_duration": 585789000
 *   },
 *   "tool_calls": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 19,
 *     "output_tokens": 20,
 *     "total_tokens": 39
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
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " translation",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " of",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " \"",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "I",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * ...
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "model": "llama3.1:8b",
 *     "created_at": "2024-08-12T22:13:22.22423Z",
 *     "done_reason": "stop",
 *     "done": true,
 *     "total_duration": 8599883208,
 *     "load_duration": 35975875,
 *     "prompt_eval_count": 19,
 *     "prompt_eval_duration": 7918195000,
 *     "eval_count": 20,
 *     "eval_duration": 643569000
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 19,
 *     "output_tokens": 20,
 *     "total_tokens": 39
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
 *     id: '49410cad-2163-415e-bdcd-d26938a9c8c5',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     id: '39e230e4-63ec-4fae-9df0-21c3abe735ad',
 *     type: 'tool_call'
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
 *   punchline: 'Why did the cat join a band? Because it wanted to be the purr-cussionist!',
 *   rating: 8,
 *   setup: 'A cat walks into a music store and asks the owner...'
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
 * { input_tokens: 19, output_tokens: 20, total_tokens: 39 }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Response Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForResponseMetadata = await llm.invoke(input);
 * console.log(aiMsgForResponseMetadata.response_metadata);
 * ```
 *
 * ```txt
 * {
 *   model: 'llama3.1:8b',
 *   created_at: '2024-08-12T22:17:42.274795Z',
 *   done_reason: 'stop',
 *   done: true,
 *   total_duration: 6767071209,
 *   load_duration: 31628209,
 *   prompt_eval_count: 19,
 *   prompt_eval_duration: 6124504000,
 *   eval_count: 20,
 *   eval_duration: 608785000
 * }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatOllama extends BaseChatModel<ChatOllamaCallOptions, AIMessageChunk> implements ChatOllamaInput {
  // Used for tracing, replace with the same name as your class
  static lc_name(): string;
  model: string;
  numa?: boolean;
  numCtx?: number;
  numBatch?: number;
  numGpu?: number;
  mainGpu?: number;
  lowVram?: boolean;
  f16Kv?: boolean;
  logitsAll?: boolean;
  vocabOnly?: boolean;
  useMmap?: boolean;
  useMlock?: boolean;
  embeddingOnly?: boolean;
  numThread?: number;
  numKeep?: number;
  seed?: number;
  numPredict?: number;
  topK?: number;
  topP?: number;
  tfsZ?: number;
  typicalP?: number;
  repeatLastN?: number;
  temperature?: number;
  repeatPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  mirostat?: number;
  mirostatTau?: number;
  mirostatEta?: number;
  penalizeNewline?: boolean;
  streaming?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: string | Record<string, any>;
  keepAlive?: string | number;
  client: Ollama;
  checkOrPullModel: boolean;
  baseUrl: string;
  think?: boolean;
  constructor(fields?: ChatOllamaInput);
  // Replace
  _llmType(): string;
  /**
   * Download a model onto the local machine.
   *
   * @param {string} model The name of the model to download.
   * @param {PullModelOptions | undefined} options Options for pulling the model.
   * @returns {Promise<void>}
   */
  pull(model: string, options?: PullModelOptions): Promise<void>;
  bindTools(tools: BindToolsInput[], kwargs?: Partial<this["ParsedCallOptions"]>): Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOllamaCallOptions>;
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  invocationParams(options?: this["ParsedCallOptions"]): Omit<ChatRequest, "messages">;
  private checkModelExistsOnMachine;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
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
  withStructuredOutput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>, config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { ChatOllama, ChatOllamaCallOptions, ChatOllamaInput, PullModelOptions };
//# sourceMappingURL=chat_models.d.ts.map