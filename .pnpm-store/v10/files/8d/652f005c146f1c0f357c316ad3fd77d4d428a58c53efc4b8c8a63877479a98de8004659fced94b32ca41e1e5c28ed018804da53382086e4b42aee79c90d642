import { InputValues, PartialValues } from "../utils/types/index.cjs";
import { BasePromptTemplate, BasePromptTemplateInput } from "./base.cjs";
import { SerializedBasePromptTemplate } from "./serde.cjs";

//#region src/prompts/pipeline.d.ts
/**
 * Type that includes the name of the prompt and the prompt itself.
 */
type PipelinePromptParams<PromptTemplateType extends BasePromptTemplate> = {
  name: string;
  prompt: PromptTemplateType;
};
/**
 * Type that extends the BasePromptTemplateInput type, excluding the
 * inputVariables property. It includes an array of pipelinePrompts and a
 * finalPrompt.
 */
type PipelinePromptTemplateInput<PromptTemplateType extends BasePromptTemplate> = Omit<BasePromptTemplateInput, "inputVariables"> & {
  pipelinePrompts: PipelinePromptParams<PromptTemplateType>[];
  finalPrompt: PromptTemplateType;
};
/**
 * Class that handles a sequence of prompts, each of which may require
 * different input variables. Includes methods for formatting these
 * prompts, extracting required input values, and handling partial
 * prompts.
 * @example
 * ```typescript
 * const composedPrompt = new PipelinePromptTemplate({
 *   pipelinePrompts: [
 *     {
 *       name: "introduction",
 *       prompt: PromptTemplate.fromTemplate(`You are impersonating {person}.`),
 *     },
 *     {
 *       name: "example",
 *       prompt: PromptTemplate.fromTemplate(
 *         `Here's an example of an interaction:
 * Q: {example_q}
 * A: {example_a}`,
 *       ),
 *     },
 *     {
 *       name: "start",
 *       prompt: PromptTemplate.fromTemplate(
 *         `Now, do this for real!
 * Q: {input}
 * A:`,
 *       ),
 *     },
 *   ],
 *   finalPrompt: PromptTemplate.fromTemplate(
 *     `{introduction}
 * {example}
 * {start}`,
 *   ),
 * });
 *
 * const formattedPrompt = await composedPrompt.format({
 *   person: "Elon Musk",
 *   example_q: `What's your favorite car?`,
 *   example_a: "Tesla",
 *   input: `What's your favorite social media site?`,
 * });
 * ```
 */
declare class PipelinePromptTemplate<PromptTemplateType extends BasePromptTemplate> extends BasePromptTemplate {
  static lc_name(): string;
  pipelinePrompts: PipelinePromptParams<PromptTemplateType>[];
  finalPrompt: PromptTemplateType;
  constructor(input: PipelinePromptTemplateInput<PromptTemplateType>);
  /**
   * Computes the input values required by the pipeline prompts.
   * @returns Array of input values required by the pipeline prompts.
   */
  protected computeInputValues(): string[];
  protected static extractRequiredInputValues(allValues: InputValues, requiredValueNames: string[]): InputValues;
  /**
   * Formats the pipeline prompts based on the provided input values.
   * @param values Input values to format the pipeline prompts.
   * @returns Promise that resolves with the formatted input values.
   */
  protected formatPipelinePrompts(values: InputValues): Promise<InputValues>;
  /**
   * Formats the final prompt value based on the provided input values.
   * @param values Input values to format the final prompt value.
   * @returns Promise that resolves with the formatted final prompt value.
   */
  formatPromptValue(values: InputValues): Promise<PromptTemplateType["PromptValueReturnType"]>;
  format(values: InputValues): Promise<string>;
  /**
   * Handles partial prompts, which are prompts that have been partially
   * filled with input values.
   * @param values Partial input values.
   * @returns Promise that resolves with a new PipelinePromptTemplate instance with updated input variables.
   */
  partial(values: PartialValues): Promise<PipelinePromptTemplate<PromptTemplateType>>;
  serialize(): SerializedBasePromptTemplate;
  _getPromptType(): string;
}
//#endregion
export { PipelinePromptParams, PipelinePromptTemplate, PipelinePromptTemplateInput };
//# sourceMappingURL=pipeline.d.cts.map