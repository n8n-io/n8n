import { BaseChain, ChainInputs } from "./base.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { ClientOptions, OpenAIClient } from "@langchain/openai";
import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";

//#region src/chains/openai_moderation.d.ts

/**
 * Interface for the input parameters of the OpenAIModerationChain class.
 */
interface OpenAIModerationChainInput extends ChainInputs, AsyncCallerParams {
  apiKey?: string;
  /** @deprecated Use "apiKey" instead. */
  openAIApiKey?: string;
  openAIOrganization?: string;
  throwError?: boolean;
  configuration?: ClientOptions;
}
/**
 * Class representing a chain for moderating text using the OpenAI
 * Moderation API. It extends the BaseChain class and implements the
 * OpenAIModerationChainInput interface.
 * @example
 * ```typescript
 * const moderation = new OpenAIModerationChain({ throwError: true });
 *
 * const badString = "Bad naughty words from user";
 *
 * try {
 *   const { output: moderatedContent, results } = await moderation.call({
 *     input: badString,
 *   });
 *
 *   if (results[0].category_scores["harassment/threatening"] > 0.01) {
 *     throw new Error("Harassment detected!");
 *   }
 *
 *   const model = new OpenAI({ temperature: 0 });
 *   const promptTemplate = "Hello, how are you today {person}?";
 *   const prompt = new PromptTemplate({
 *     template: promptTemplate,
 *     inputVariables: ["person"],
 *   });
 *   const chain = new LLMChain({ llm: model, prompt });
 *   const response = await chain.call({ person: moderatedContent });
 *   console.log({ response });
 * } catch (error) {
 *   console.error("Naughty words detected!");
 * }
 * ```
 */
declare class OpenAIModerationChain extends BaseChain implements OpenAIModerationChainInput {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  inputKey: string;
  outputKey: string;
  openAIApiKey?: string;
  openAIOrganization?: string;
  clientConfig: ClientOptions;
  client: OpenAIClient;
  throwError: boolean;
  caller: AsyncCaller;
  constructor(fields?: OpenAIModerationChainInput);
  _moderate(text: string, results: OpenAIClient.Moderation): string;
  _call(values: ChainValues): Promise<ChainValues>;
  _chainType(): string;
  get inputKeys(): string[];
  get outputKeys(): string[];
}
//#endregion
export { OpenAIModerationChain, OpenAIModerationChainInput };
//# sourceMappingURL=openai_moderation.d.cts.map