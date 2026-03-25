import { ContentBlock } from "../messages/content/index.cjs";
import { InputValues, PartialValues } from "../utils/types/index.cjs";
import { ImageContent, ImagePromptValue } from "../prompt_values.cjs";
import { BasePromptTemplate, BasePromptTemplateInput, TypedPromptInputValues } from "./base.cjs";
import { TemplateFormat } from "./template.cjs";

//#region src/prompts/image.d.ts
/**
 * Inputs to create a {@link ImagePromptTemplate}
 * @augments BasePromptTemplateInput
 */
interface ImagePromptTemplateInput<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BasePromptTemplateInput<RunInput, PartialVariableName> {
  /**
   * The prompt template
   */
  template: Record<string, unknown>;
  /**
   * The format of the prompt template. Options are 'f-string'
   *
   * @defaultValue 'f-string'
   */
  templateFormat?: TemplateFormat;
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
/**
 * An image prompt template for a multimodal model.
 */
declare class ImagePromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BasePromptTemplate<RunInput, ImagePromptValue, PartialVariableName> {
  static lc_name(): string;
  lc_namespace: string[];
  template: Record<string, unknown>;
  templateFormat: TemplateFormat;
  validateTemplate: boolean;
  /**
   * Additional fields which should be included inside
   * the message content array if using a complex message
   * content.
   */
  additionalContentFields?: ContentBlock;
  constructor(input: ImagePromptTemplateInput<RunInput, PartialVariableName>);
  _getPromptType(): "prompt";
  /**
   * Partially applies values to the prompt template.
   * @param values The values to be partially applied to the prompt template.
   * @returns A new instance of ImagePromptTemplate with the partially applied values.
   */
  partial<NewPartialVariableName extends string>(values: PartialValues<NewPartialVariableName>): Promise<ImagePromptTemplate<InputValues<Exclude<Extract<keyof RunInput, string>, NewPartialVariableName>>, any>>;
  /**
   * Formats the prompt template with the provided values.
   * @param values The values to be used to format the prompt template.
   * @returns A promise that resolves to a string which is the formatted prompt.
   */
  format<FormatOutput = ImageContent>(values: TypedPromptInputValues<RunInput>): Promise<FormatOutput>;
  /**
   * Formats the prompt given the input values and returns a formatted
   * prompt value.
   * @param values The input values to format the prompt.
   * @returns A Promise that resolves to a formatted prompt value.
   */
  formatPromptValue(values: TypedPromptInputValues<RunInput>): Promise<ImagePromptValue>;
}
//#endregion
export { ImagePromptTemplate, ImagePromptTemplateInput };
//# sourceMappingURL=image.d.cts.map