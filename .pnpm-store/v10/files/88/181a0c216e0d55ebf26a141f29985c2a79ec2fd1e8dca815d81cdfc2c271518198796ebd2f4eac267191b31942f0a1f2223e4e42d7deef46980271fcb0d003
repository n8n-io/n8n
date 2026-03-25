import { ContentBlock } from "../messages/content/index.cjs";
import { MessageContent } from "../messages/base.cjs";
import { InputValues, PartialValues } from "../utils/types/index.cjs";
import { BasePromptTemplateInput, TypedPromptInputValues } from "./base.cjs";
import { BaseStringPromptTemplate } from "./string.cjs";
import { TemplateFormat } from "./template.cjs";
import { SerializedPromptTemplate } from "./serde.cjs";

//#region src/prompts/prompt.d.ts
/**
 * Inputs to create a {@link PromptTemplate}
 * @augments BasePromptTemplateInput
 */
interface PromptTemplateInput<RunInput extends InputValues = any, PartialVariableName extends string = any, Format extends TemplateFormat = TemplateFormat> extends BasePromptTemplateInput<RunInput, PartialVariableName> {
  /**
   * The prompt template
   */
  template: MessageContent;
  /**
   * The format of the prompt template. Options are "f-string" and "mustache"
   */
  templateFormat?: Format;
  /**
   * Whether or not to try validating the template on initialization
   *
   * @defaultValue `true`
   */
  validateTemplate?: boolean;
  /**
   * Additional fields which should be included inside
   * the message content array if using a complex message
   * content.
   */
  additionalContentFields?: ContentBlock;
}
type NonAlphanumeric = " " | "\t" | "\n" | "\r" | '"' | "'" | "{" | "[" | "(" | "`" | ":" | ";";
/**
 * Recursive type to extract template parameters from a string.
 * @template T - The input string.
 * @template Result - The resulting array of extracted template parameters.
 */
type ExtractTemplateParamsRecursive<T extends string, Result extends string[] = []> = T extends `${string}{${infer Param}}${infer Rest}` ? Param extends `${NonAlphanumeric}${string}` ? ExtractTemplateParamsRecursive<Rest, Result> : ExtractTemplateParamsRecursive<Rest, [...Result, Param]> : Result;
type ParamsFromFString<T extends string> = { [Key in ExtractTemplateParamsRecursive<T>[number] | (string & Record<never, never>)]: any };
type ExtractedFStringParams<T extends string, RunInput extends InputValues = Symbol> = RunInput extends Symbol ? ParamsFromFString<T> : RunInput;
/**
 * Schema to represent a basic prompt for an LLM.
 * @augments BasePromptTemplate
 * @augments PromptTemplateInput
 *
 * @example
 * ```ts
 * import { PromptTemplate } from "langchain/prompts";
 *
 * const prompt = new PromptTemplate({
 *   inputVariables: ["foo"],
 *   template: "Say {foo}",
 * });
 * ```
 */
declare class PromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BaseStringPromptTemplate<RunInput, PartialVariableName> implements PromptTemplateInput<RunInput, PartialVariableName> {
  static lc_name(): string;
  template: MessageContent;
  templateFormat: TemplateFormat;
  validateTemplate: boolean;
  /**
   * Additional fields which should be included inside
   * the message content array if using a complex message
   * content.
   */
  additionalContentFields?: ContentBlock;
  constructor(input: PromptTemplateInput<RunInput, PartialVariableName>);
  _getPromptType(): "prompt";
  /**
   * Formats the prompt template with the provided values.
   * @param values The values to be used to format the prompt template.
   * @returns A promise that resolves to a string which is the formatted prompt.
   */
  format(values: TypedPromptInputValues<RunInput>): Promise<string>;
  /**
   * Take examples in list format with prefix and suffix to create a prompt.
   *
   * Intended to be used a a way to dynamically create a prompt from examples.
   *
   * @param examples - List of examples to use in the prompt.
   * @param suffix - String to go after the list of examples. Should generally set up the user's input.
   * @param inputVariables - A list of variable names the final prompt template will expect
   * @param exampleSeparator - The separator to use in between examples
   * @param prefix - String that should go before any examples. Generally includes examples.
   *
   * @returns The final prompt template generated.
   */
  static fromExamples(examples: string[], suffix: string, inputVariables: string[], exampleSeparator?: string, prefix?: string): PromptTemplate<any, any>;
  /**
   * Load prompt template from a template f-string
   */
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string, "f-string">, "template" | "inputVariables">): PromptTemplate<ExtractedFStringParams<T, RunInput>>;
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string>, "template" | "inputVariables">): PromptTemplate<ExtractedFStringParams<T, RunInput>>;
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string, "mustache">, "template" | "inputVariables">): PromptTemplate<InputValues>;
  /**
   * Partially applies values to the prompt template.
   * @param values The values to be partially applied to the prompt template.
   * @returns A new instance of PromptTemplate with the partially applied values.
   */
  partial<NewPartialVariableName extends string>(values: PartialValues<NewPartialVariableName>): Promise<PromptTemplate<InputValues<Exclude<Extract<keyof RunInput, string>, NewPartialVariableName>>, any>>;
  serialize(): SerializedPromptTemplate;
  static deserialize(data: SerializedPromptTemplate): Promise<PromptTemplate>;
}
//#endregion
export { ExtractedFStringParams, ParamsFromFString, PromptTemplate, PromptTemplateInput };
//# sourceMappingURL=prompt.d.cts.map