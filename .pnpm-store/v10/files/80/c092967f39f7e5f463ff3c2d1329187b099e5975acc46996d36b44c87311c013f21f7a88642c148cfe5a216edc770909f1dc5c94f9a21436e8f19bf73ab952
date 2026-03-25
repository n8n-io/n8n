import { ChatBedrockConverseToolType, ConverseCommandParams, CredentialType } from "./types.js";
import { BedrockConverseToolChoice } from "./utils/tools.js";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { BedrockRuntimeClient, BedrockRuntimeClientConfig, ConverseRequest, GuardrailConfiguration, PerformanceConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { DefaultProviderInit } from "@aws-sdk/credential-provider-node";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { DocumentType } from "@smithy/types";

//#region src/chat_models.d.ts

/**
 * Inputs for ChatBedrockConverse.
 */
interface ChatBedrockConverseInput extends BaseChatModelParams, Partial<DefaultProviderInit> {
  /**
   * The BedrockRuntimeClient to use.
   * It gives ability to override the default client with a custom one, allowing you to pass requestHandler {NodeHttpHandler} parameter
   * in case it is not provided here.
   */
  client?: BedrockRuntimeClient;
  /**
   * Overrideable configuration options for the BedrockRuntimeClient.
   * Allows customization of client configuration such as requestHandler, etc.
   * Will be ignored if 'client' is provided.
   */
  clientOptions?: BedrockRuntimeClientConfig;
  /**
   * Whether or not to stream responses
   */
  streaming?: boolean;
  /**
   * Model to use.
   * For example, "anthropic.claude-3-haiku-20240307-v1:0", this is equivalent to the modelId property in the
   * list-foundation-models api.
   * See the below link for a full list of models.
   * @link https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns
   *
   * @default anthropic.claude-3-haiku-20240307-v1:0
   */
  model?: string;
  /**
   * The AWS region e.g. `us-west-2`.
   * Fallback to AWS_DEFAULT_REGION env variable or region specified in ~/.aws/config
   * in case it is not provided here.
   */
  region?: string;
  /**
   * AWS Credentials. If no credentials are provided, the default credentials from
   * `@aws-sdk/credential-provider-node` will be used.
   */
  credentials?: CredentialType;
  /**
   * Temperature.
   */
  temperature?: number;
  /**
   * Max tokens.
   */
  maxTokens?: number;
  /**
   * Override the default endpoint hostname.
   */
  endpointHost?: string;
  /**
   * The percentage of most-likely candidates that the model considers for the next token. For
   * example, if you choose a value of 0.8 for `topP`, the model selects from the top 80% of the
   * probability distribution of tokens that could be next in the sequence.
   * The default value is the default value for the model that you are using.
   * For more information, see the inference parameters for foundation models link below.
   * @link https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html
   */
  topP?: number;
  /**
   * Additional inference parameters that the model supports, beyond the
   * base set of inference parameters that the Converse API supports in the `inferenceConfig`
   * field. For more information, see the model parameters link below.
   * @link https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html
   */
  additionalModelRequestFields?: DocumentType;
  /**
   * Whether or not to include usage data, like token counts
   * in the streamed response chunks. Passing as a call option will
   * take precedence over the class-level setting.
   * @default true
   */
  streamUsage?: boolean;
  /**
   * Configuration information for a guardrail that you want to use in the request.
   */
  guardrailConfig?: GuardrailConfiguration;
  /**
   * Model performance configuration.
   * See https://docs.aws.amazon.com/bedrock/latest/userguide/latency-optimized-inference.html
   */
  performanceConfig?: PerformanceConfiguration;
  /**
   * Which types of `tool_choice` values the model supports.
   *
   * Inferred if not specified. Inferred as ['auto', 'any', 'tool'] if a 'claude-3'
   * model is used, ['auto', 'any'] if a 'mistral-large' model is used, empty otherwise.
   */
  supportsToolChoiceValues?: Array<"auto" | "any" | "tool">;
}
interface ChatBedrockConverseCallOptions extends BaseChatModelCallOptions, Pick<ChatBedrockConverseInput, "additionalModelRequestFields" | "streamUsage" | "guardrailConfig" | "performanceConfig"> {
  /**
   * A list of stop sequences. A stop sequence is a sequence of characters that causes
   * the model to stop generating the response.
   */
  stop?: string[];
  tools?: ChatBedrockConverseToolType[];
  /**
   * Tool choice for the model. If passing a string, it must be "any", "auto" or the
   * name of the tool to use. Or, pass a BedrockToolChoice object.
   *
   * If "any" is passed, the model must request at least one tool.
   * If "auto" is passed, the model automatically decides if a tool should be called
   * or whether to generate text instead.
   * If a tool name is passed, it will force the model to call that specific tool.
   */
  tool_choice?: BedrockConverseToolChoice;
  /**
   * Key-value pairs that you can use to filter invocation logs.
   */
  requestMetadata?: ConverseRequest["requestMetadata"];
}
/**
 * AWS Bedrock Converse chat model integration.
 *
 * Setup:
 * Install `@langchain/aws` and set the following environment variables:
 *
 * ```bash
 * npm install @langchain/aws
 * export BEDROCK_AWS_REGION="your-aws-region"
 * export BEDROCK_AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
 * export BEDROCK_AWS_ACCESS_KEY_ID="your-aws-access-key-id"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_aws.ChatBedrockConverse.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_aws.ChatBedrockConverseCallOptions.html)
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
 * import { ChatBedrockConverse } from '@langchain/aws';
 *
 * const llm = new ChatBedrockConverse({
 *   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
 *   temperature: 0,
 *   maxTokens: undefined,
 *   timeout: undefined,
 *   maxRetries: 2,
 *   region: process.env.BEDROCK_AWS_REGION,
 *   credentials: {
 *     secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
 *     accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
 *   },
 *   // Configure client options (e.g., custom request handler)
 *   // clientOptions: {
 *   //   requestHandler: myCustomRequestHandler,
 *   // },
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
 *   "id": "81a27f7a-550c-473d-8307-c2fbb9c74956",
 *   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
 *   "response_metadata": {
 *     "$metadata": {
 *       "httpStatusCode": 200,
 *       "requestId": "81a27f7a-550c-473d-8307-c2fbb9c74956",
 *       "attempts": 1,
 *       "totalRetryDelay": 0
 *     },
 *     "metrics": {
 *       "latencyMs": 1109
 *     },
 *     "stopReason": "end_turn",
 *     "usage": {
 *       "inputTokens": 25,
 *       "outputTokens": 19,
 *       "totalTokens": 44
 *     }
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 25,
 *     "output_tokens": 19,
 *     "total_tokens": 44
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
 *   "content": ""
 *   "response_metadata": {
 *     "messageStart": {
 *       "p": "abcdefghijk",
 *       "role": "assistant"
 *     }
 *   }
 * }
 * AIMessageChunk {
 *   "content": "Here"
 * }
 * AIMessageChunk {
 *   "content": "'s"
 * }
 * AIMessageChunk {
 *   "content": " the translation"
 * }
 * AIMessageChunk {
 *   "content": " to"
 * }
 * AIMessageChunk {
 *   "content": " French:\n\nJ"
 * }
 * AIMessageChunk {
 *   "content": "'adore la"
 * }
 * AIMessageChunk {
 *   "content": " programmation."
 * }
 * AIMessageChunk {
 *   "content": ""
 *   "response_metadata": {
 *     "contentBlockStop": {
 *       "contentBlockIndex": 0,
 *       "p": "abcdefghijk"
 *     }
 *   }
 * }
 * AIMessageChunk {
 *   "content": ""
 *   "response_metadata": {
 *     "messageStop": {
 *       "stopReason": "end_turn"
 *     }
 *   }
 * }
 * AIMessageChunk {
 *   "content": ""
 *   "response_metadata": {
 *     "metadata": {
 *       "metrics": {
 *         "latencyMs": 838
 *       },
 *       "p": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123",
 *       "usage": {
 *         "inputTokens": 25,
 *         "outputTokens": 19,
 *         "totalTokens": 44
 *       }
 *     }
 *   }
 *   "usage_metadata": {
 *     "input_tokens": 25,
 *     "output_tokens": 19,
 *     "total_tokens": 44
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
 *   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
 *   "response_metadata": {
 *     "messageStart": {
 *       "p": "ab",
 *       "role": "assistant"
 *     },
 *     "contentBlockStop": {
 *       "contentBlockIndex": 0,
 *       "p": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJK"
 *     },
 *     "messageStop": {
 *       "stopReason": "end_turn"
 *     },
 *     "metadata": {
 *       "metrics": {
 *         "latencyMs": 838
 *       },
 *       "p": "abcdefghijklmnopqrstuvwxyz",
 *       "usage": {
 *         "inputTokens": 25,
 *         "outputTokens": 19,
 *         "totalTokens": 44
 *       }
 *     }
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 25,
 *     "output_tokens": 19,
 *     "total_tokens": 44
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
 * const llmWithTools = llm.bindTools(
 *   [GetWeather, GetPopulation],
 *   {
 *     // strict: true  // enforce tool args schema is respected
 *   }
 * );
 * const aiMsg = await llmWithTools.invoke(
 *   "Which city is hotter today and which is bigger: LA or NY?"
 * );
 * console.log(aiMsg.tool_calls);
 * ```
 *
 * ```txt
 * [
 *   {
 *     id: 'tooluse_hIaiqfweRtSiJyi6J4naJA',
 *     name: 'GetWeather',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call'
 *   },
 *   {
 *     id: 'tooluse_nOS8B0UlTd2FdpH4MSHw9w',
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call'
 *   },
 *   {
 *     id: 'tooluse_XxMpZiETQ5aVS5opVDyIaw',
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call'
 *   },
 *   {
 *     id: 'tooluse_GpYvAfldT2aR8VQfH-p4PQ',
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
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
 * <summary><strong>Multimodal</strong></summary>
 *
 * ```typescript
 * import { HumanMessage } from '@langchain/core/messages';
 *
 * const imageUrl = "https://example.com/image.jpg";
 * const imageData = await fetch(imageUrl).then(res => res.arrayBuffer());
 * const base64Image = Buffer.from(imageData).toString('base64');
 *
 * const message = new HumanMessage({
 *   content: [
 *     { type: "text", text: "describe the weather in this image" },
 *     {
 *       type: "image_url",
 *       image_url: { url: `data:image/jpeg;base64,${base64Image}` },
 *     },
 *   ]
 * });
 *
 * const imageDescriptionAiMsg = await llm.invoke([message]);
 * console.log(imageDescriptionAiMsg.content);
 * ```
 *
 * ```txt
 * The weather in this image appears to be clear and pleasant. The sky is a vibrant blue with scattered white clouds, suggesting a sunny day with good visibility. The clouds are light and wispy, indicating fair weather conditions. There's no sign of rain, storm, or any adverse weather patterns. The lush green grass on the rolling hills looks well-watered and healthy, which could indicate recent rainfall or generally favorable weather conditions. Overall, the image depicts a beautiful, calm day with blue skies and sunshine - perfect weather for enjoying the outdoors.
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
 * { input_tokens: 25, output_tokens: 19, total_tokens: 44 }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Stream Usage Metadata</strong></summary>
 *
 * ```typescript
 * const streamForMetadata = await llm.stream(input);
 * let fullForMetadata: AIMessageChunk | undefined;
 * for await (const chunk of streamForMetadata) {
 *   fullForMetadata = !fullForMetadata ? chunk : concat(fullForMetadata, chunk);
 * }
 * console.log(fullForMetadata?.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 25, output_tokens: 19, total_tokens: 44 }
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
 *   '$metadata': {
 *     httpStatusCode: 200,
 *     requestId: '5de2a2e5-d1dc-4dff-bb02-31361f4107bc',
 *     extendedRequestId: undefined,
 *     cfId: undefined,
 *     attempts: 1,
 *     totalRetryDelay: 0
 *   },
 *   metrics: { latencyMs: 1163 },
 *   stopReason: 'end_turn',
 *   usage: { inputTokens: 25, outputTokens: 19, totalTokens: 44 }
 * }
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatBedrockConverse extends BaseChatModel<ChatBedrockConverseCallOptions, AIMessageChunk> implements ChatBedrockConverseInput {
  // Used for tracing, replace with the same name as your class
  static lc_name(): string;
  /**
   * Replace with any secrets this class passes to `super`.
   * See {@link ../../langchain-cohere/src/chat_model.ts} for
   * an example.
   */
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  model: string;
  streaming: boolean;
  region: string;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  endpointHost?: string;
  topP?: number;
  additionalModelRequestFields?: DocumentType;
  streamUsage: boolean;
  guardrailConfig?: GuardrailConfiguration;
  performanceConfig?: PerformanceConfiguration;
  client: BedrockRuntimeClient;
  clientOptions?: BedrockRuntimeClientConfig;
  /**
   * Which types of `tool_choice` values the model supports.
   *
   * Inferred if not specified. Inferred as ['auto', 'any', 'tool'] if a 'claude-3'
   * model is used, ['auto', 'any'] if a 'mistral-large' model is used, empty otherwise.
   */
  supportsToolChoiceValues?: Array<"auto" | "any" | "tool">;
  constructor(fields?: ChatBedrockConverseInput);
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  bindTools(tools: ChatBedrockConverseToolType[], kwargs?: Partial<this["ParsedCallOptions"]>): Runnable<BaseLanguageModelInput, AIMessageChunk, this["ParsedCallOptions"]>;
  // Replace
  _llmType(): string;
  invocationParams(options?: this["ParsedCallOptions"]): Partial<ConverseCommandParams>;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _generateNonStreaming(messages: BaseMessage[], options: Partial<this["ParsedCallOptions"]>, _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
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
}
//#endregion
export { ChatBedrockConverse, ChatBedrockConverseCallOptions, ChatBedrockConverseInput };
//# sourceMappingURL=chat_models.d.ts.map