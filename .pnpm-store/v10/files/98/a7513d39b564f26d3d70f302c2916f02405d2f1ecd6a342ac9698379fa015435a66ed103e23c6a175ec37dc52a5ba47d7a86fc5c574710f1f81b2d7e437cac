import { BaseMessage } from "../messages/base.cjs";
import { InputValues, PartialValues } from "../utils/types/index.cjs";
import { BasePromptTemplateInput, Example, TypedPromptInputValues } from "./base.cjs";
import { BaseExampleSelector } from "../example_selectors/base.cjs";
import { BaseStringPromptTemplate } from "./string.cjs";
import { TemplateFormat } from "./template.cjs";
import { SerializedFewShotTemplate } from "./serde.cjs";
import { PromptTemplate } from "./prompt.cjs";
import { BaseChatPromptTemplate, BaseMessagePromptTemplate } from "./chat.cjs";

//#region src/prompts/few_shot.d.ts
interface FewShotPromptTemplateInput extends BasePromptTemplateInput<InputValues> {
  /**
   * Examples to format into the prompt. Exactly one of this or
   * {@link exampleSelector} must be
   * provided.
   */
  examples?: Example[];
  /**
   * An {@link BaseExampleSelector} Examples to format into the prompt. Exactly one of this or
   * {@link examples} must be
   * provided.
   */
  exampleSelector?: BaseExampleSelector;
  /**
   * An {@link PromptTemplate} used to format a single example.
   */
  examplePrompt: PromptTemplate;
  /**
   * String separator used to join the prefix, the examples, and suffix.
   */
  exampleSeparator?: string;
  /**
   * A prompt template string to put before the examples.
   *
   * @defaultValue `""`
   */
  prefix?: string;
  /**
   * A prompt template string to put after the examples.
   */
  suffix?: string;
  /**
   * The format of the prompt template. Options are: 'f-string'
   */
  templateFormat?: TemplateFormat;
  /**
   * Whether or not to try validating the template on initialization.
   */
  validateTemplate?: boolean;
}
/**
 * Prompt template that contains few-shot examples.
 * @augments BasePromptTemplate
 * @augments FewShotPromptTemplateInput
 * @example
 * ```typescript
 * const examplePrompt = PromptTemplate.fromTemplate(
 *   "Input: {input}\nOutput: {output}",
 * );
 *
 * const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
 *   [
 *     { input: "happy", output: "sad" },
 *     { input: "tall", output: "short" },
 *     { input: "energetic", output: "lethargic" },
 *     { input: "sunny", output: "gloomy" },
 *     { input: "windy", output: "calm" },
 *   ],
 *   new OpenAIEmbeddings(),
 *   HNSWLib,
 *   { k: 1 },
 * );
 *
 * const dynamicPrompt = new FewShotPromptTemplate({
 *   exampleSelector,
 *   examplePrompt,
 *   prefix: "Give the antonym of every input",
 *   suffix: "Input: {adjective}\nOutput:",
 *   inputVariables: ["adjective"],
 * });
 *
 * // Format the dynamic prompt with the input 'rainy'
 * console.log(await dynamicPrompt.format({ adjective: "rainy" }));
 *
 * ```
 */
declare class FewShotPromptTemplate extends BaseStringPromptTemplate implements FewShotPromptTemplateInput {
  lc_serializable: boolean;
  examples?: InputValues[];
  exampleSelector?: BaseExampleSelector | undefined;
  examplePrompt: PromptTemplate;
  suffix: string;
  exampleSeparator: string;
  prefix: string;
  templateFormat: TemplateFormat;
  validateTemplate: boolean;
  constructor(input: FewShotPromptTemplateInput);
  _getPromptType(): "few_shot";
  static lc_name(): string;
  private getExamples;
  partial<NewPartialVariableName extends string>(values: PartialValues<NewPartialVariableName>): Promise<FewShotPromptTemplate>;
  /**
   * Formats the prompt with the given values.
   * @param values The values to format the prompt with.
   * @returns A promise that resolves to a string representing the formatted prompt.
   */
  format(values: InputValues): Promise<string>;
  serialize(): SerializedFewShotTemplate;
  static deserialize(data: SerializedFewShotTemplate): Promise<FewShotPromptTemplate>;
}
interface FewShotChatMessagePromptTemplateInput extends BasePromptTemplateInput<InputValues> {
  /**
   * Examples to format into the prompt. Exactly one of this or
   * {@link exampleSelector} must be
   * provided.
   */
  examples?: Example[];
  /**
   * An {@link BaseMessagePromptTemplate} | {@link BaseChatPromptTemplate} used to format a single example.
   */
  examplePrompt: BaseMessagePromptTemplate | BaseChatPromptTemplate;
  /**
   * String separator used to join the prefix, the examples, and suffix.
   *
   * @defaultValue `"\n\n"`
   */
  exampleSeparator?: string;
  /**
   * An {@link BaseExampleSelector} Examples to format into the prompt. Exactly one of this or
   * {@link examples} must be
   * provided.
   */
  exampleSelector?: BaseExampleSelector | undefined;
  /**
   * A prompt template string to put before the examples.
   *
   * @defaultValue `""`
   */
  prefix?: string;
  /**
   * A prompt template string to put after the examples.
   *
   * @defaultValue `""`
   */
  suffix?: string;
  /**
   * The format of the prompt template. Options are: 'f-string'
   *
   * @defaultValue `f-string`
   */
  templateFormat?: TemplateFormat;
  /**
   * Whether or not to try validating the template on initialization.
   *
   * @defaultValue `true`
   */
  validateTemplate?: boolean;
}
/**
 * Chat prompt template that contains few-shot examples.
 * @augments BasePromptTemplateInput
 * @augments FewShotChatMessagePromptTemplateInput
 */
declare class FewShotChatMessagePromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BaseChatPromptTemplate implements FewShotChatMessagePromptTemplateInput {
  lc_serializable: boolean;
  examples?: InputValues[];
  exampleSelector?: BaseExampleSelector | undefined;
  examplePrompt: BaseMessagePromptTemplate | BaseChatPromptTemplate;
  suffix: string;
  exampleSeparator: string;
  prefix: string;
  templateFormat: TemplateFormat;
  validateTemplate: boolean;
  _getPromptType(): "few_shot_chat";
  static lc_name(): string;
  constructor(fields: FewShotChatMessagePromptTemplateInput);
  private getExamples;
  /**
   * Formats the list of values and returns a list of formatted messages.
   * @param values The values to format the prompt with.
   * @returns A promise that resolves to a string representing the formatted prompt.
   */
  formatMessages(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage[]>;
  /**
   * Formats the prompt with the given values.
   * @param values The values to format the prompt with.
   * @returns A promise that resolves to a string representing the formatted prompt.
   */
  format(values: TypedPromptInputValues<RunInput>): Promise<string>;
  /**
   * Partially formats the prompt with the given values.
   * @param values The values to partially format the prompt with.
   * @returns A promise that resolves to an instance of `FewShotChatMessagePromptTemplate` with the given values partially formatted.
   */
  partial(values: PartialValues<PartialVariableName>): Promise<FewShotChatMessagePromptTemplate<RunInput, PartialVariableName>>;
}
//#endregion
export { FewShotChatMessagePromptTemplate, FewShotChatMessagePromptTemplateInput, FewShotPromptTemplate, FewShotPromptTemplateInput };
//# sourceMappingURL=few_shot.d.cts.map