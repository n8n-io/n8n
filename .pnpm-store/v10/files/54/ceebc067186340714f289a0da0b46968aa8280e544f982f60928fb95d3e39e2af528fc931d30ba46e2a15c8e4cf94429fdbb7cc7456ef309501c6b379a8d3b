import { CohereClientOptions } from "./client.cjs";
import { Cohere, CohereClient } from "cohere-ai";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { Runnable } from "@langchain/core/runnables";

//#region src/chat_models.d.ts
type ChatCohereToolType = BindToolsInput | Cohere.Tool;
/**
 * Input interface for ChatCohere
 */
interface BaseChatCohereInput extends BaseChatModelParams {
  /**
   * The API key to use.
   * @default {process.env.COHERE_API_KEY}
   */
  apiKey?: string;
  /**
   * The name of the model to use.
   * @default {"command"}
   */
  model?: string;
  /**
   * What sampling temperature to use, between 0.0 and 2.0.
   * Higher values like 0.8 will make the output more random,
   * while lower values like 0.2 will make it more focused
   * and deterministic.
   * @default {0.3}
   */
  temperature?: number;
  /**
   * Whether or not to stream the response.
   * @default {false}
   */
  streaming?: boolean;
  /**
   * Whether or not to include token usage when streaming.
   * This will include an extra chunk at the end of the stream
   * with `eventType: "stream-end"` and the token usage in
   * `usage_metadata`.
   * @default {true}
   */
  streamUsage?: boolean;
}
type ChatCohereInput = BaseChatCohereInput & CohereClientOptions;
interface TokenUsage {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
}
interface ChatCohereCallOptions extends BaseChatModelCallOptions, Partial<Omit<Cohere.ChatRequest, "message" | "tools">>, Partial<Omit<Cohere.ChatStreamRequest, "message" | "tools">>, Pick<ChatCohereInput, "streamUsage"> {
  tools?: ChatCohereToolType[];
}
/**
 * Integration for Cohere chat models.
 *
 * Setup:
 * Install `@langchain/cohere` and set a environment variable called `COHERE_API_KEY`.
 *
 * ```bash
 * npm install @langchain/cohere
 * export COHERE_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_cohere.ChatCohere.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_cohere.ChatCohereCallOptions.html)
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
 * import { ChatCohere } from '@langchain/cohere';
 *
 * const llm = new ChatCohere({
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
 *   "content": "\"J'adore programmer.\"",
 *   "additional_kwargs": {
 *     ...
 *   },
 *   "response_metadata": {
 *     "estimatedTokenUsage": {
 *       "completionTokens": 6,
 *       "promptTokens": 75,
 *       "totalTokens": 81
 *     },
 *     "response_id": "54cebd43-737f-458b-bff4-01b220eaf373",
 *     "generationId": "48a567da-0f88-4606-bba6-becbeee464bd",
 *     "chatHistory": [
 *       {
 *         "role": "USER",
 *         "message": "Translate \"I love programming\" into French."
 *       },
 *       {
 *         "role": "CHATBOT",
 *         "message": "\"J'adore programmer.\""
 *       }
 *     ],
 *     "finishReason": "COMPLETE",
 *     "meta": {
 *       "apiVersion": {
 *         "version": "1"
 *       },
 *       "billedUnits": {
 *         "inputTokens": 9,
 *         "outputTokens": 6
 *       },
 *       "tokens": {
 *         "inputTokens": 75,
 *         "outputTokens": 6
 *       }
 *     }
 *   },
 *   "tool_calls": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 75,
 *     "output_tokens": 6,
 *     "total_tokens": 81
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
 *   "content": "",
 *   "additional_kwargs": {
 *     "eventType": "stream-start",
 *     "is_finished": false,
 *     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa"
 *   },
 *   "response_metadata": {
 *     "eventType": "stream-start",
 *     "is_finished": false,
 *     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa"
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "J",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "'",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "adore",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": " programmer",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": ".\"",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": []
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {
 *     "eventType": "stream-end"
 *   },
 *   "response_metadata": {
 *     "eventType": "stream-end",
 *     "response_id": "687f94a6-13b7-4c2c-98be-9ca5573c722f",
 *     "text": "\"J'adore programmer.\"",
 *     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa",
 *     "chatHistory": [
 *       {
 *         "role": "USER",
 *         "message": "Translate \"I love programming\" into French."
 *       },
 *       {
 *         "role": "CHATBOT",
 *         "message": "\"J'adore programmer.\""
 *       }
 *     ],
 *     "finishReason": "COMPLETE",
 *     "meta": {
 *       "apiVersion": {
 *         "version": "1"
 *       },
 *       "billedUnits": {
 *         "inputTokens": 9,
 *         "outputTokens": 6
 *       },
 *       "tokens": {
 *         "inputTokens": 75,
 *         "outputTokens": 6
 *       }
 *     }
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 75,
 *     "output_tokens": 6,
 *     "total_tokens": 81
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
 *   "content": "\"J'adore programmer.\"",
 *   "additional_kwargs": {
 *     ...
 *   },
 *   "response_metadata": {
 *     "is_finished": false,
 *     "generationId": "303e0215-96f4-4da5-8c2a-10da3840afce303e0215-96f4-4da5-8c2a-10da3840afce",
 *     "response_id": "6a8cb7ef-f1b9-44f6-a1df-67aa506d3f0f",
 *     "text": "\"J'adore programmer.\"",
 *     "chatHistory": [
 *       {
 *         "role": "USER",
 *         "message": "Translate \"I love programming\" into French."
 *       },
 *       {
 *         "role": "CHATBOT",
 *         "message": "\"J'adore programmer.\""
 *       }
 *     ],
 *     "finishReason": "COMPLETE",
 *     "meta": {
 *       "apiVersion": {
 *         "version": "1"
 *       },
 *       "billedUnits": {
 *         "inputTokens": 9,
 *         "outputTokens": 6
 *       },
 *       "tokens": {
 *         "inputTokens": 75,
 *         "outputTokens": 6
 *       }
 *     }
 *   },
 *   "tool_calls": [],
 *   "tool_call_chunks": [],
 *   "invalid_tool_calls": [],
 *   "usage_metadata": {
 *     "input_tokens": 75,
 *     "output_tokens": 6,
 *     "total_tokens": 81
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
 *     args: { location: 'LA' },
 *     id: 'ce8076ee-2ed3-429d-938c-14f3218c',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'NY' },
 *     id: '23d1a96e-3a2c-46f4-9d9e-cccd02c6',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'LA' },
 *     id: '2bf9d627-310f-46ff-93a9-86baeae9',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'NY' },
 *     id: 'c95e6ac0-ee9b-48de-86b2-12548fd1',
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
 *   punchline: 'Because she wanted to be a first-aid kit.',
 *   rating: 5,
 *   setup: 'Why did the cat join the Red Cross?'
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <summary><strong>Usage Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForMetadata = await llm.invoke(input);
 * console.log(aiMsgForMetadata.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 75, output_tokens: 6, total_tokens: 81 }
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
 *   estimatedTokenUsage: { completionTokens: 6, promptTokens: 75, totalTokens: 81 },
 *   response_id: 'a688ad65-4db2-4a7a-b6aa-124aa2410319',
 *   generationId: 'ee259727-18c5-43f7-b9bd-a2a60c0c040b',
 *   chatHistory: [
 *     {
 *       role: 'USER',
 *       message: 'Translate "I love programming" into French.'
 *     },
 *     { role: 'CHATBOT', message: `"J'adore programmer."` }
 *   ],
 *   finishReason: 'COMPLETE',
 *   meta: {
 *     apiVersion: { version: '1' },
 *     billedUnits: { inputTokens: 9, outputTokens: 6 },
 *     tokens: { inputTokens: 75, outputTokens: 6 }
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatCohere<CallOptions extends ChatCohereCallOptions = ChatCohereCallOptions> extends BaseChatModel<CallOptions, AIMessageChunk> implements ChatCohereInput {
  static lc_name(): string;
  lc_serializable: boolean;
  client: CohereClient;
  model: string;
  temperature: number;
  streaming: boolean;
  streamUsage: boolean;
  constructor(fields?: ChatCohereInput);
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  _llmType(): string;
  invocationParams(options: this["ParsedCallOptions"]): {
    [k: string]: string | number | CallOptions["connectors"] | CallOptions["conversationId"] | CallOptions["documents"] | CallOptions["forceSingleStep"] | CallOptions["preamble"] | CallOptions["promptTruncation"] | CallOptions["searchQueriesOnly"] | CallOptions["tools"] | undefined;
  };
  bindTools(tools: ChatCohereToolType[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
  /** @ignore */
  private _getChatRequest;
  private _getCurrChatTurnMessages;
  private _messagesToCohereToolResultsCurrChatTurn;
  private _messageToCohereToolResults;
  private _formatCohereToolCalls;
  private _convertCohereToolCallToLangchain;
  /** @ignore */
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _combineLLMOutput(...llmOutputs: CohereLLMOutput[]): CohereLLMOutput;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
}
interface CohereLLMOutput {
  estimatedTokenUsage?: TokenUsage;
}
//#endregion
export { BaseChatCohereInput, ChatCohere, ChatCohereCallOptions, ChatCohereInput };
//# sourceMappingURL=chat_models.d.cts.map