import { Serializable } from "../load/serializable.cjs";
import { Example } from "../prompts/base.cjs";

//#region src/example_selectors/base.d.ts
/**
 * Base class for example selectors.
 */
declare abstract class BaseExampleSelector extends Serializable {
  lc_namespace: string[];
  /**
   * Adds an example to the example selector.
   * @param example The example to add to the example selector.
   * @returns A Promise that resolves to void or a string.
   */
  abstract addExample(example: Example): Promise<void | string>;
  /**
   * Selects examples from the example selector given the input variables.
   * @param input_variables The input variables to select examples with.
   * @returns A Promise that resolves to an array of selected examples.
   */
  abstract selectExamples(input_variables: Example): Promise<Example[]>;
}
//#endregion
export { BaseExampleSelector };
//# sourceMappingURL=base.d.cts.map