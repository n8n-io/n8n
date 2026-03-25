import { BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
import * as _langchain_core_load_serializable0 from "@langchain/core/load/serializable";
import { ChatOpenAICallOptions, ChatOpenAICompletions, OpenAIChatInput, OpenAIClient, OpenAICoreRequestOptions } from "@langchain/openai";

//#region src/chat_models/fireworks.d.ts
type FireworksUnsupportedArgs = "frequencyPenalty" | "presencePenalty" | "logitBias" | "functions";
type FireworksUnsupportedCallOptions = "functions" | "function_call";
type ChatFireworksCallOptions = Partial<Omit<ChatOpenAICallOptions, FireworksUnsupportedCallOptions>>;
/**
 * Wrapper around Fireworks API for large language models fine-tuned for chat
 *
 * Fireworks API is compatible to the OpenAI API with some limitations described in
 * https://readme.fireworks.ai/docs/openai-compatibility.
 *
 * To use, you should have the `FIREWORKS_API_KEY` environment variable set.
 *
 * Setup:
 * Install `@langchain/community` and set a environment variable called `FIREWORKS_API_KEY`.
 *
 * ```bash
 * npm install @langchain/community
 * export FIREWORKS_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_community_chat_models_fireworks.ChatFireworks.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_openai.ChatOpenAICallOptions.html)
 *
 * Because the Fireworks API extends OpenAI's, the call option type is the same.
 *
 * Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
 * They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
 *
 * ```typescript
 * // When calling `.withConfig`, call options should be passed via the first argument
 * const llmWithArgsBound = llm.withConfig({
 *   stop: ["\n"],
 *   tools: [...],
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
 * import { ChatFireworks } from '@langchain/community/chat_models/fireworks';
 *
 * const llm = new ChatFireworks({
 *   model: "command-r-plus",
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
 *   "id": "dbc233df-532e-4aaa-8995-9d6ea65fea15",
 *   "content": "The translation of \"I love programming\" into French is:\n\n\"J'adore la programmation.\"\n\nHere's a breakdown of the translation:\n\n* \"I\" is translated to \"Je\" (but in informal writing, it's common to use \"J'\" instead of \"Je\" when it's followed by a vowel)\n* \"love\" is translated to \"adore\"\n* \"programming\" is translated to \"la programmation\"\n\nSo, the complete translation is \"J'adore la programmation.\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "tokenUsage": {
 *       "completionTokens": 105,
 *       "promptTokens": 19,
 *       "totalTokens": 124
 *     },
 *     "finish_reason": "stop"
 *   },
 *   "tool_calls": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 19,
 *     "output_tokens": 105,
 *     "total_tokens": 124
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
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "The translation",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": " of \"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "I love",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": " programming\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": " into French",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": " is:\n\n",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "\"J",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * ...
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "ation.\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": null
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "id": "ed5fc403-b7ed-4447-819f-f9645ea0277c",
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": "stop"
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 19,
 *     "output_tokens": 105,
 *     "total_tokens": 124
 *   }
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
 *   "id": "9b80e5af-0f50-4fb7-b700-6d431a819556",
 *   "content": "The translation of \"I love programming\" into French is:\n\n\"J'adore la programmation.\"\n\nHere's a breakdown of the translation:\n\n* \"I\" is translated to \"Je\" (but in informal writing, it's common to use \"J'\" instead of \"Je\" when it's followed by a vowel)\n* \"love\" is translated to \"adore\"\n* \"programming\" is translated to \"la programmation\"\n\nSo, the complete translation is \"J'adore la programmation.\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": "stop"
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 19,
 *     "output_tokens": 105,
 *     "total_tokens": 124
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
 * const llmForToolCalling = new ChatFireworks({
 *   // Use a model with tool calling capability
 *   model: "accounts/fireworks/models/firefunction-v2",
 *   temperature: 0,
 *   // other params...
 * });
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
 *     id: 'call_9DE0WnhgKDbxu6HyHOkDQFub'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_58lcAPTqQyiqepxynwARhGs8'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'call_r0m6AFoqaMvPp4Zt5aEAc0oE'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_mENaPG1ryOF44BmaW4VkBaSi'
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
 *   setup: 'Why did the cat join a band?',
 *   punchline: 'Because it wanted to be the purr-cussionist!',
 *   rating: 8
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 *
 * <summary><strong>Usage Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForMetadata = await llm.invoke(input);
 * console.log(aiMsgForMetadata.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 277, output_tokens: 8, total_tokens: 285 }
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
 *   tokenUsage: { completionTokens: 8, promptTokens: 277, totalTokens: 285 },
 *   finish_reason: 'stop'
 * }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatFireworks extends ChatOpenAICompletions<ChatFireworksCallOptions> {
  static lc_name(): string;
  _llmType(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  fireworksApiKey?: string;
  apiKey?: string;
  constructor(fields?: Partial<Omit<OpenAIChatInput, "openAIApiKey" | FireworksUnsupportedArgs>> & BaseChatModelParams & {
    /**
     * Prefer `apiKey`
     */
    fireworksApiKey?: string;
    /**
     * The Fireworks API key to use.
     */
    apiKey?: string;
  });
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  toJSON(): _langchain_core_load_serializable0.Serialized;
  completionWithRetry(request: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming, options?: OpenAICoreRequestOptions): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>>;
  completionWithRetry(request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming, options?: OpenAICoreRequestOptions): Promise<OpenAIClient.Chat.Completions.ChatCompletion>;
}
//#endregion
export { ChatFireworks, ChatFireworksCallOptions };
//# sourceMappingURL=fireworks.d.cts.map