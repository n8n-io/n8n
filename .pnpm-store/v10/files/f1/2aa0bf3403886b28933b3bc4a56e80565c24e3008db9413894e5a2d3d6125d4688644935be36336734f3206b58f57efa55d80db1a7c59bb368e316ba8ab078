import { Example } from "../prompts/base.cjs";
import { BaseExampleSelector } from "./base.cjs";
import { PromptTemplate } from "../prompts/prompt.cjs";

//#region src/example_selectors/length_based.d.ts
/**
 * Interface for the input parameters of the LengthBasedExampleSelector
 * class.
 */
interface LengthBasedExampleSelectorInput {
  examplePrompt: PromptTemplate;
  maxLength?: number;
  getTextLength?: (text: string) => number;
}
/**
 * A specialized example selector that selects examples based on their
 * length, ensuring that the total length of the selected examples does
 * not exceed a specified maximum length.
 * @example
 * ```typescript
 * const exampleSelector = new LengthBasedExampleSelector(
 *   [
 *     { input: "happy", output: "sad" },
 *     { input: "tall", output: "short" },
 *     { input: "energetic", output: "lethargic" },
 *     { input: "sunny", output: "gloomy" },
 *     { input: "windy", output: "calm" },
 *   ],
 *   {
 *     examplePrompt: new PromptTemplate({
 *       inputVariables: ["input", "output"],
 *       template: "Input: {input}\nOutput: {output}",
 *     }),
 *     maxLength: 25,
 *   },
 * );
 * const dynamicPrompt = new FewShotPromptTemplate({
 *   exampleSelector,
 *   examplePrompt: new PromptTemplate({
 *     inputVariables: ["input", "output"],
 *     template: "Input: {input}\nOutput: {output}",
 *   }),
 *   prefix: "Give the antonym of every input",
 *   suffix: "Input: {adjective}\nOutput:",
 *   inputVariables: ["adjective"],
 * });
 * console.log(dynamicPrompt.format({ adjective: "big" }));
 * console.log(
 *   dynamicPrompt.format({
 *     adjective:
 *       "big and huge and massive and large and gigantic and tall and much much much much much bigger than everything else",
 *   }),
 * );
 * ```
 */
declare class LengthBasedExampleSelector extends BaseExampleSelector {
  protected examples: Example[];
  examplePrompt: PromptTemplate;
  getTextLength: (text: string) => number;
  maxLength: number;
  exampleTextLengths: number[];
  constructor(data: LengthBasedExampleSelectorInput);
  /**
   * Adds an example to the list of examples and calculates its length.
   * @param example The example to be added.
   * @returns Promise that resolves when the example has been added and its length calculated.
   */
  addExample(example: Example): Promise<void>;
  /**
   * Calculates the lengths of the examples.
   * @param v Array of lengths of the examples.
   * @param values Instance of LengthBasedExampleSelector.
   * @returns Promise that resolves with an array of lengths of the examples.
   */
  calculateExampleTextLengths(v: number[], values: LengthBasedExampleSelector): Promise<number[]>;
  /**
   * Selects examples until the total length of the selected examples
   * reaches the maxLength.
   * @param inputVariables The input variables for the examples.
   * @returns Promise that resolves with an array of selected examples.
   */
  selectExamples(inputVariables: Example): Promise<Example[]>;
  /**
   * Creates a new instance of LengthBasedExampleSelector and adds a list of
   * examples to it.
   * @param examples Array of examples to be added.
   * @param args Input parameters for the LengthBasedExampleSelector.
   * @returns Promise that resolves with a new instance of LengthBasedExampleSelector with the examples added.
   */
  static fromExamples(examples: Example[], args: LengthBasedExampleSelectorInput): Promise<LengthBasedExampleSelector>;
}
//#endregion
export { LengthBasedExampleSelector, LengthBasedExampleSelectorInput };
//# sourceMappingURL=length_based.d.cts.map