import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { GenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/experimental/llms/chrome_ai.d.ts
interface AILanguageModelFactory {
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
  capabilities(): Promise<AILanguageModelCapabilities>;
}
interface AILanguageModel extends EventTarget {
  prompt(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): ReadableStream;
  countPromptTokens(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): Promise<number>;
  get maxTokens(): number;
  get tokensSoFar(): number;
  get tokensLeft(): number;
  get topK(): number;
  get temperature(): number;
  oncontextoverflow: (event: Event) => void;
  clone(options?: AILanguageModelCloneOptions): Promise<AILanguageModel>;
  destroy(): void;
}
interface AILanguageModelCapabilities {
  readonly available: AICapabilityAvailability;
  languageAvailable(languageTag: string): AICapabilityAvailability;
  get defaultTopK(): number | undefined;
  get maxTopK(): number | undefined;
  get defaultTemperature(): number | undefined;
  get maxTemperature(): number | undefined;
}
interface AILanguageModelCreateOptions {
  signal?: AbortSignal;
  monitor?: AICreateMonitorCallback;
  systemPrompt?: string;
  initialPrompts?: AILanguageModelInitialPrompt[];
  topK: number;
  temperature: number;
}
interface AILanguageModelInitialPrompt {
  role: AILanguageModelInitialPromptRole;
  content: string;
}
interface AILanguageModelPrompt {
  role: AILanguageModelPromptRole;
  content: string;
}
interface AILanguageModelPromptOptions {
  signal?: AbortSignal;
}
interface AILanguageModelCloneOptions {
  signal?: AbortSignal;
}
type AILanguageModelPromptInput = string | AILanguageModelPrompt | AILanguageModelPrompt[];
declare enum AILanguageModelInitialPromptRole {
  "system" = 0,
  "user" = 1,
  "assistant" = 2,
}
declare enum AILanguageModelPromptRole {
  "user" = 0,
  "assistant" = 1,
}
type AICapabilityAvailability = "yes" | "no";
type AICreateMonitorCallback = () => void;
interface ChromeAIInputs extends BaseLLMParams {
  topK?: number;
  temperature?: number;
  systemPrompt?: string;
}
interface ChromeAICallOptions extends BaseLanguageModelCallOptions {}
/**
 * To use this model you need to have the `Built-in AI Early Preview Program`
 * for Chrome. You can find more information about the program here:
 * @link https://developer.chrome.com/docs/ai/built-in
 *
 * @example
 * ```typescript
 * // Initialize the ChromeAI model.
 * const model = new ChromeAI({
 *   temperature: 0.5, // Optional. Default is 0.5.
 *   topK: 40, // Optional. Default is 40.
 * });
 *
 * // Call the model with a message and await the response.
 * const response = await model.invoke([
 *   new HumanMessage({ content: "My name is John." }),
 * ]);
 * ```
 */
declare class ChromeAI extends LLM<ChromeAICallOptions> {
  temperature?: number;
  topK?: number;
  systemPrompt?: string;
  static lc_name(): string;
  constructor(inputs?: ChromeAIInputs);
  _llmType(): string;
  /**
   * Initialize the model. This method may be called before invoking the model
   * to set up a chat session in advance.
   */
  protected createSession(): Promise<any>;
  _streamResponseChunks(prompt: string, _options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  _call(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
}
//#endregion
export { AICapabilityAvailability, AICreateMonitorCallback, AILanguageModel, AILanguageModelCloneOptions, AILanguageModelFactory, AILanguageModelInitialPrompt, AILanguageModelPrompt, AILanguageModelPromptInput, AILanguageModelPromptOptions, ChromeAI, ChromeAICallOptions, ChromeAIInputs };
//# sourceMappingURL=chrome_ai.d.cts.map