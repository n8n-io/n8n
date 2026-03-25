import { GoogleGenerativeAIThinkingConfig, GoogleGenerativeAIToolType } from "./types.cjs";
import * as _google_generative_ai0 from "@google/generative-ai";
import { CachedContent, GenerateContentRequest, ModelParams, Part, RequestOptions, SafetySetting, Schema } from "@google/generative-ai";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
import { ModelProfile } from "@langchain/core/language_models/profile";
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { SerializableSchema } from "@langchain/core/utils/standard_schema";

//#region src/chat_models.d.ts
type BaseMessageExamplePair = {
  input: BaseMessage;
  output: BaseMessage;
};
interface GoogleGenerativeAIChatCallOptions extends BaseChatModelCallOptions {
  tools?: GoogleGenerativeAIToolType[];
  /**
   * Allowed functions to call when the mode is "any".
   * If empty, any one of the provided functions are called.
   */
  allowedFunctionNames?: string[];
  /**
   * Whether or not to include usage data, like token counts
   * in the streamed response chunks.
   * @default true
   */
  streamUsage?: boolean;
  /**
   * JSON schema to be returned by the model.
   */
  responseSchema?: Schema;
}
/**
 * An interface defining the input to the ChatGoogleGenerativeAI class.
 */
interface GoogleGenerativeAIChatInput extends BaseChatModelParams, Pick<GoogleGenerativeAIChatCallOptions, "streamUsage"> {
  /**
   * Model Name to use
   *
   * Note: The format must follow the pattern - `{model}`
   */
  model: ModelParams["model"];
  /**
   * Controls the randomness of the output.
   *
   * Values can range from [0.0,2.0], inclusive. A value closer to 2.0
   * will produce responses that are more varied and creative, while
   * a value closer to 0.0 will typically result in less surprising
   * responses from the model.
   *
   * Note: The default value varies by model
   */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the completion.
   */
  maxOutputTokens?: number;
  /**
   * Top-p changes how the model selects tokens for output.
   *
   * Tokens are selected from most probable to least until the sum
   * of their probabilities equals the top-p value.
   *
   * For example, if tokens A, B, and C have a probability of
   * .3, .2, and .1 and the top-p value is .5, then the model will
   * select either A or B as the next token (using temperature).
   *
   * Note: The default value varies by model
   */
  topP?: number;
  /**
   * Top-k changes how the model selects tokens for output.
   *
   * A top-k of 1 means the selected token is the most probable among
   * all tokens in the model's vocabulary (also called greedy decoding),
   * while a top-k of 3 means that the next token is selected from
   * among the 3 most probable tokens (using temperature).
   *
   * Note: The default value varies by model
   */
  topK?: number;
  /**
   * The set of character sequences (up to 5) that will stop output generation.
   * If specified, the API will stop at the first appearance of a stop
   * sequence.
   *
   * Note: The stop sequence will not be included as part of the response.
   * Note: stopSequences is only supported for Gemini models
   */
  stopSequences?: string[];
  /**
   * A list of unique `SafetySetting` instances for blocking unsafe content. The API will block
   * any prompts and responses that fail to meet the thresholds set by these settings. If there
   * is no `SafetySetting` for a given `SafetyCategory` provided in the list, the API will use
   * the default safety setting for that category.
   */
  safetySettings?: SafetySetting[];
  /**
   * Google API key to use
   */
  apiKey?: string;
  /**
   * Google API version to use
   */
  apiVersion?: string;
  /**
   * Google API base URL to use
   */
  baseUrl?: string;
  /**
   * Google API custom headers to use
   */
  customHeaders?: Record<string, string>;
  /** Whether to stream the results or not */
  streaming?: boolean;
  /**
   * Whether or not to force the model to respond with JSON.
   * Available for `gemini-1.5` models and later.
   * @default false
   */
  json?: boolean;
  /**
   * Whether or not model supports system instructions.
   * The following models support system instructions:
   * - All Gemini 1.5 Pro model versions
   * - All Gemini 1.5 Flash model versions
   * - Gemini 1.0 Pro version gemini-1.0-pro-002
   */
  convertSystemMessageToHumanContent?: boolean | undefined;
  /**
   * Optional. Config for thinking features. An error will be returned if this
   * field is set for models that don't support thinking.
   */
  thinkingConfig?: GoogleGenerativeAIThinkingConfig;
}
/**
 * Google Generative AI chat model integration.
 *
 * Setup:
 * Install `@langchain/google-genai` and set an environment variable named `GOOGLE_API_KEY`.
 *
 * ```bash
 * npm install @langchain/google-genai
 * export GOOGLE_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_google_genai.ChatGoogleGenerativeAI.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_google_genai.GoogleGenerativeAIChatCallOptions.html)
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
 * import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
 *
 * const llm = new ChatGoogleGenerativeAI({
 *   model: "gemini-1.5-flash",
 *   temperature: 0,
 *   maxRetries: 2,
 *   // apiKey: "...",
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
 *   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
 *   "response_metadata": {
 *     "finishReason": "STOP",
 *     "index": 0,
 *     "safetyRatings": [
 *       {
 *         "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_HATE_SPEECH",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_HARASSMENT",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
 *         "probability": "NEGLIGIBLE"
 *       }
 *     ]
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 149,
 *     "total_tokens": 159
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
 *   "content": "There",
 *   "response_metadata": {
 *     "index": 0
 *   }
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 1,
 *     "total_tokens": 11
 *   }
 * }
 * AIMessageChunk {
 *   "content": " are a few ways to translate \"I love programming\" into French, depending on",
 * }
 * AIMessageChunk {
 *   "content": " the level of formality and nuance you want to convey:\n\n**Formal:**\n\n",
 * }
 * AIMessageChunk {
 *   "content": "* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This",
 * }
 * AIMessageChunk {
 *   "content": " is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More",
 * }
 * AIMessageChunk {
 *   "content": " specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and",
 * }
 * AIMessageChunk {
 *   "content": " your intended audience. \n",
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
 *   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 277,
 *     "total_tokens": 287
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
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call'
 *   },
 *   {
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
 *   setup: "Why don\\'t cats play poker?",
 *   punchline: "Why don\\'t cats play poker? Because they always have an ace up their sleeve!"
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
 * The weather in the image appears to be clear and sunny. The sky is mostly blue with a few scattered white clouds, indicating fair weather. The bright sunlight is casting shadows on the green, grassy hill, suggesting it is a pleasant day with good visibility. There are no signs of rain or stormy conditions.
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
 * { input_tokens: 10, output_tokens: 149, total_tokens: 159 }
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
 *   finishReason: 'STOP',
 *   index: 0,
 *   safetyRatings: [
 *     {
 *       category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
 *       probability: 'NEGLIGIBLE'
 *     },
 *     {
 *       category: 'HARM_CATEGORY_HATE_SPEECH',
 *       probability: 'NEGLIGIBLE'
 *     },
 *     { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
 *     {
 *       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
 *       probability: 'NEGLIGIBLE'
 *     }
 *   ]
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Document Messages</strong></summary>
 *
 * This example will show you how to pass documents such as PDFs to Google
 * Generative AI through messages.
 *
 * ```typescript
 * const pdfPath = "/Users/my_user/Downloads/invoice.pdf";
 * const pdfBase64 = await fs.readFile(pdfPath, "base64");
 *
 * const response = await llm.invoke([
 *   ["system", "Use the provided documents to answer the question"],
 *   [
 *     "user",
 *     [
 *       {
 *         type: "application/pdf", // If the `type` field includes a single slash (`/`), it will be treated as inline data.
 *         data: pdfBase64,
 *       },
 *       {
 *         type: "text",
 *         text: "Summarize the contents of this PDF",
 *       },
 *     ],
 *   ],
 * ]);
 *
 * console.log(response.content);
 * ```
 *
 * ```txt
 * This is a billing invoice from Twitter Developers for X API Basic Access. The transaction date is January 7, 2025,
 * and the amount is $194.34, which has been paid. The subscription period is from January 7, 2025 21:02 to February 7, 2025 00:00 (UTC).
 * The tax is $0.00, with a tax rate of 0%. The total amount is $194.34. The payment was made using a Visa card ending in 7022,
 * expiring in 12/2026. The billing address is Brace Sproul, 1234 Main Street, San Francisco, CA, US 94103. The company being billed is
 * X Corp, located at 865 FM 1209 Building 2, Bastrop, TX, US 78602. Terms and conditions apply.
 * ```
 * </details>
 *
 * <br />
 */
declare class ChatGoogleGenerativeAI extends BaseChatModel<GoogleGenerativeAIChatCallOptions, AIMessageChunk> implements GoogleGenerativeAIChatInput {
  static lc_name(): string;
  lc_serializable: boolean;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_namespace: string[];
  get lc_aliases(): {
    apiKey: string;
  };
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences: string[];
  safetySettings?: SafetySetting[];
  apiKey?: string;
  streaming: boolean;
  json?: boolean;
  streamUsage: boolean;
  convertSystemMessageToHumanContent: boolean | undefined;
  thinkingConfig?: GoogleGenerativeAIThinkingConfig;
  private client;
  get _isMultimodalModel(): boolean;
  constructor(model: ModelParams["model"], fields?: Omit<GoogleGenerativeAIChatInput, "model">);
  constructor(fields: GoogleGenerativeAIChatInput);
  useCachedContent(cachedContent: CachedContent, modelParams?: ModelParams, requestOptions?: RequestOptions): void;
  get useSystemInstruction(): boolean;
  get computeUseSystemInstruction(): boolean;
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  _combineLLMOutput(): never[];
  _llmType(): string;
  bindTools(tools: GoogleGenerativeAIToolType[], kwargs?: Partial<GoogleGenerativeAIChatCallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, GoogleGenerativeAIChatCallOptions>;
  invocationParams(options?: this["ParsedCallOptions"]): Omit<GenerateContentRequest, "contents">;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  completionWithRetry(request: string | GenerateContentRequest | (string | Part)[], options?: this["ParsedCallOptions"]): Promise<_google_generative_ai0.GenerateContentResult>;
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
   * const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash" });
   * const profile = model.profile;
   * console.log(profile.maxInputTokens); // 2000000
   * console.log(profile.imageInputs); // true
   * ```
   */
  get profile(): ModelProfile;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
    raw: BaseMessage;
    parsed: RunOutput;
  }>;
}
//#endregion
export { BaseMessageExamplePair, ChatGoogleGenerativeAI, GoogleGenerativeAIChatCallOptions, GoogleGenerativeAIChatInput };
//# sourceMappingURL=chat_models.d.cts.map