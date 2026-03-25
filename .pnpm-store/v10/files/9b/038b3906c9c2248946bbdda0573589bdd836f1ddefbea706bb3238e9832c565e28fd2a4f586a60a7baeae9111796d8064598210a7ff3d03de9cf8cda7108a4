import { SerializedFields } from "../load/map_keys.cjs";
import { InputValues, PartialValues, StringWithAutocomplete } from "../utils/types/index.cjs";
import { BaseCallbackConfig } from "../callbacks/manager.cjs";
import { Runnable } from "../runnables/base.cjs";
import { BasePromptValueInterface } from "../prompt_values.cjs";
import { BaseOutputParser } from "../output_parsers/base.cjs";

//#region src/prompts/base.d.ts
type TypedPromptInputValues<RunInput> = InputValues<StringWithAutocomplete<Extract<keyof RunInput, string>>>;
type Example = Record<string, string>;
/**
 * Input common to all prompt templates.
 */
interface BasePromptTemplateInput<InputVariables extends InputValues = any, PartialVariableName extends string = any> {
  /**
   * A list of variable names the prompt template expects
   */
  inputVariables: Array<Extract<keyof InputVariables, string>>;
  /**
   * How to parse the output of calling an LLM on this formatted prompt
   */
  outputParser?: BaseOutputParser;
  /** Partial variables */
  partialVariables?: PartialValues<PartialVariableName>;
}
/**
 * Base class for prompt templates. Exposes a format method that returns a
 * string prompt given a set of input values.
 */
declare abstract class BasePromptTemplate<RunInput extends InputValues = any, RunOutput extends BasePromptValueInterface = BasePromptValueInterface, PartialVariableName extends string = any> extends Runnable<RunInput, RunOutput> implements BasePromptTemplateInput {
  PromptValueReturnType: RunOutput;
  lc_serializable: boolean;
  lc_namespace: string[];
  get lc_attributes(): SerializedFields | undefined;
  inputVariables: Array<Extract<keyof RunInput, string>>;
  outputParser?: BaseOutputParser;
  partialVariables: PartialValues<PartialVariableName>;
  /**
   * Metadata to be used for tracing.
   */
  metadata?: Record<string, unknown>;
  /** Tags to be used for tracing. */
  tags?: string[];
  constructor(input: BasePromptTemplateInput);
  abstract partial(values: PartialValues): Promise<BasePromptTemplate<RunInput, RunOutput, PartialVariableName>>;
  /**
   * Merges partial variables and user variables.
   * @param userVariables The user variables to merge with the partial variables.
   * @returns A Promise that resolves to an object containing the merged variables.
   */
  mergePartialAndUserVariables(userVariables: TypedPromptInputValues<RunInput>): Promise<InputValues<Extract<keyof RunInput, string> | PartialVariableName>>;
  /**
   * Invokes the prompt template with the given input and options.
   * @param input The input to invoke the prompt template with.
   * @param options Optional configuration for the callback.
   * @returns A Promise that resolves to the output of the prompt template.
   */
  invoke(input: RunInput, options?: BaseCallbackConfig): Promise<RunOutput>;
  /**
   * Format the prompt given the input values.
   *
   * @param values - A dictionary of arguments to be passed to the prompt template.
   * @returns A formatted prompt string.
   *
   * @example
   * ```ts
   * prompt.format({ foo: "bar" });
   * ```
   */
  abstract format(values: TypedPromptInputValues<RunInput>): Promise<string>;
  /**
   * Format the prompt given the input values and return a formatted prompt value.
   * @param values
   * @returns A formatted PromptValue.
   */
  abstract formatPromptValue(values: TypedPromptInputValues<RunInput>): Promise<RunOutput>;
  /**
   * Return the string type key uniquely identifying this class of prompt template.
   */
  abstract _getPromptType(): string;
}
//#endregion
export { BasePromptTemplate, BasePromptTemplateInput, Example, TypedPromptInputValues };
//# sourceMappingURL=base.d.cts.map