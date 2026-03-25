import { BaseBedrockInput, CredentialType } from "../../utils/bedrock/index.cjs";
import { SerializedFields } from "../../load/map_keys.cjs";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { AIMessageChunk, BaseMessage, BaseMessageChunk } from "@langchain/core/messages";
import { EventStreamCodec } from "@smithy/eventstream-codec";
import { Runnable } from "@langchain/core/runnables";

//#region src/chat_models/bedrock/web.d.ts
type AnthropicTool = Record<string, unknown>;
type BedrockChatToolType = BindToolsInput | AnthropicTool;
declare function convertMessagesToPromptAnthropic(messages: BaseMessage[], humanPrompt?: string, aiPrompt?: string): string;
/**
 * Function that converts an array of messages into a single string prompt
 * that can be used as input for a chat model. It delegates the conversion
 * logic to the appropriate provider-specific function.
 * @param messages Array of messages to be converted.
 * @param options Options to be used during the conversion.
 * @returns A string prompt that can be used as input for a chat model.
 */
declare function convertMessagesToPrompt(messages: BaseMessage[], provider: string): string;
interface BedrockChatCallOptions extends BaseChatModelCallOptions {
  tools?: BedrockChatToolType[];
}
interface BedrockChatFields extends Partial<BaseBedrockInput>, BaseChatModelParams {}
/**
 * AWS Bedrock chat model integration.
 *
 * Setup:
 * Install `@langchain/community` and set the following environment variables:
 *
 * ```bash
 * npm install @langchain/openai
 * export AWS_REGION="your-aws-region"
 * export AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
 * export AWS_ACCESS_KEY_ID="your-aws-access-key-id"
 * ```
 *
 * ## [Constructor args](/classes/langchain_community_chat_models_bedrock.BedrockChat.html#constructor)
 *
 * ## [Runtime args](/interfaces/langchain_community_chat_models_bedrock_web.BedrockChatCallOptions.html)
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
 *     stop: ["stop on this token!"],
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
 * import { BedrockChat } from '@langchain/community/chat_models/bedrock/web';
 *
 * const llm = new BedrockChat({
 *   region: process.env.AWS_REGION,
 *   maxRetries: 0,
 *   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
 *   temperature: 0,
 *   maxTokens: undefined,
 *   // other params...
 * });
 *
 * // You can also pass credentials in explicitly:
 * const llmWithCredentials = new BedrockChat({
 *   region: process.env.BEDROCK_AWS_REGION,
 *   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
 *   credentials: {
 *     secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
 *     accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
 *   },
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
 *   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
 *   "additional_kwargs": {
 *     "id": "msg_bdrk_01HCZHa2mKbMZeTeHjLDd286"
 *   },
 *   "response_metadata": {
 *     "type": "message",
 *     "role": "assistant",
 *     "model": "claude-3-5-sonnet-20240620",
 *     "stop_reason": "end_turn",
 *     "stop_sequence": null,
 *     "usage": {
 *       "input_tokens": 25,
 *       "output_tokens": 19
 *     }
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
 *   "additional_kwargs": {
 *     "id": "msg_bdrk_01RhFuGR9uJ2bj5GbdAma4y6"
 *   },
 *   "response_metadata": {
 *     "type": "message",
 *     "role": "assistant",
 *     "model": "claude-3-5-sonnet-20240620",
 *     "stop_reason": null,
 *     "stop_sequence": null
 *   },
 * }
 * AIMessageChunk {
 *   "content": "J",
 * }
 * AIMessageChunk {
 *   "content": "'adore la",
 * }
 * AIMessageChunk {
 *   "content": " programmation.",
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "additional_kwargs": {
 *     "stop_reason": "end_turn",
 *     "stop_sequence": null
 *   },
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "response_metadata": {
 *     "amazon-bedrock-invocationMetrics": {
 *       "inputTokenCount": 25,
 *       "outputTokenCount": 11,
 *       "invocationLatency": 659,
 *       "firstByteLatency": 506
 *     }
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 25,
 *     "output_tokens": 11,
 *     "total_tokens": 36
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
 *   "content": "J'adore la programmation.",
 *   "additional_kwargs": {
 *     "id": "msg_bdrk_017b6PuBybA51P5LZ9K6gZHm",
 *     "stop_reason": "end_turn",
 *     "stop_sequence": null
 *   },
 *   "response_metadata": {
 *     "type": "message",
 *     "role": "assistant",
 *     "model": "claude-3-5-sonnet-20240620",
 *     "stop_reason": null,
 *     "stop_sequence": null,
 *     "amazon-bedrock-invocationMetrics": {
 *       "inputTokenCount": 25,
 *       "outputTokenCount": 11,
 *       "invocationLatency": 1181,
 *       "firstByteLatency": 1177
 *     }
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 25,
 *     "output_tokens": 11,
 *     "total_tokens": 36
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
 * import { AIMessage } from '@langchain/core/messages';
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
 * const aiMsg: AIMessage = await llmWithTools.invoke(
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
 *     id: 'toolu_bdrk_01R2daqwHR931r4baVNzbe38',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     id: 'toolu_bdrk_01WDadwNc7PGqVZvCN7Dr7eD',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     id: 'toolu_bdrk_014b8zLkpAgpxrPfewKinJFc',
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     id: 'toolu_bdrk_01Tt8K2MUP15kNuMDFCLEFKN',
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
 * const Joke = z.object({
 *   setup: z.string().describe("The setup of the joke"),
 *   punchline: z.string().describe("The punchline to the joke"),
 *   rating: z.number().optional().describe("How funny the joke is, from 1 to 10")
 * }).describe('Joke to tell user.');
 *
 * const structuredLlm = llm.withStructuredOutput(Joke);
 * const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
 * console.log(jokeResult);
 * ```
 *
 * ```txt
 * {
 *   setup: "Why don't cats play poker in the jungle?",
 *   punchline: 'Too many cheetahs!'
 * }
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
 * "response_metadata": {
 *   "type": "message",
 *   "role": "assistant",
 *   "model": "claude-3-5-sonnet-20240620",
 *   "stop_reason": "end_turn",
 *   "stop_sequence": null,
 *   "usage": {
 *     "input_tokens": 25,
 *     "output_tokens": 19
 *   }
 * }
 * ```
 * </details>
 */
declare class BedrockChat extends BaseChatModel<BedrockChatCallOptions, AIMessageChunk> implements BaseBedrockInput {
  model: string;
  modelProvider: string;
  region: string;
  credentials: CredentialType;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  fetchFn: typeof fetch;
  endpointHost?: string;
  modelKwargs?: Record<string, unknown>;
  codec: EventStreamCodec;
  streaming: boolean;
  usesMessagesApi: boolean;
  lc_serializable: boolean;
  trace?: "ENABLED" | "DISABLED";
  guardrailIdentifier: string;
  guardrailVersion: string;
  guardrailConfig?: {
    tagSuffix: string;
    streamProcessingMode: "SYNCHRONOUS" | "ASYNCHRONOUS";
  };
  get lc_aliases(): Record<string, string>;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_attributes(): SerializedFields | undefined;
  _identifyingParams(): Record<string, string>;
  _llmType(): string;
  static lc_name(): string;
  constructor(fields?: BedrockChatFields);
  invocationParams(options?: this["ParsedCallOptions"]): {
    tools: AnthropicTool[] | undefined;
    temperature: number | undefined;
    max_tokens: number | undefined;
    stop: string[] | undefined;
    modelKwargs: Record<string, unknown> | undefined;
    guardrailConfig: {
      tagSuffix: string;
      streamProcessingMode: "ASYNCHRONOUS" | "SYNCHRONOUS";
    } | undefined;
  };
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  _generate(messages: BaseMessage[], options: Partial<this["ParsedCallOptions"]>, runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _generateNonStreaming(messages: BaseMessage[], options: Partial<this["ParsedCallOptions"]>, _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _signedFetch(messages: BaseMessage[], options: this["ParsedCallOptions"], fields: {
    bedrockMethod: "invoke" | "invoke-with-response-stream";
    endpointHost: string;
    provider: string;
  }): Promise<Response>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _readChunks(reader: any): {
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array<ArrayBuffer>, void, unknown>;
  };
  _combineLLMOutput(): {};
  bindTools(tools: BedrockChatToolType[], _kwargs?: Partial<this["ParsedCallOptions"]>): Runnable<BaseLanguageModelInput, BaseMessageChunk, this["ParsedCallOptions"]>;
}
//#endregion
export { BedrockChat, BedrockChatCallOptions, BedrockChatFields, convertMessagesToPrompt, convertMessagesToPromptAnthropic };
//# sourceMappingURL=web.d.cts.map