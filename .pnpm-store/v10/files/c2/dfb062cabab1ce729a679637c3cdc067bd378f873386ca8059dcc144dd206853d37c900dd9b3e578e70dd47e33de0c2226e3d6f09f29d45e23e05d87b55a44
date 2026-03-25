import { InputValues } from "../utils/types/index.cjs";
import { StringPromptValueInterface } from "../prompt_values.cjs";
import { BasePromptTemplate, TypedPromptInputValues } from "./base.cjs";

//#region src/prompts/string.d.ts
/**
 * Base class for string prompt templates. It extends the
 * BasePromptTemplate class and overrides the formatPromptValue method to
 * return a StringPromptValue.
 */
declare abstract class BaseStringPromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BasePromptTemplate<RunInput, StringPromptValueInterface, PartialVariableName> {
  /**
   * Formats the prompt given the input values and returns a formatted
   * prompt value.
   * @param values The input values to format the prompt.
   * @returns A Promise that resolves to a formatted prompt value.
   */
  formatPromptValue(values: TypedPromptInputValues<RunInput>): Promise<StringPromptValueInterface>;
}
//#endregion
export { BaseStringPromptTemplate };
//# sourceMappingURL=string.d.cts.map