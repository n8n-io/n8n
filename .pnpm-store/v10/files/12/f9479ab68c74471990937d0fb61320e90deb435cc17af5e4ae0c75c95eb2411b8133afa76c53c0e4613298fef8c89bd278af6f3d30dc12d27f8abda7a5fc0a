import { ParsedFStringNode, PromptTemplate, PromptTemplateInput, TypedPromptInputValues } from "@langchain/core/prompts";
import { InputValues } from "@langchain/core/utils/types";

//#region src/experimental/prompts/custom_format.d.ts
type CustomFormatPromptTemplateInput<RunInput extends InputValues> = Omit<PromptTemplateInput<RunInput, string>, "templateFormat"> & {
  customParser: (template: string) => ParsedFStringNode[];
  templateValidator?: (template: string, inputVariables: string[]) => boolean;
  renderer: (template: string, values: InputValues) => string;
};
declare class CustomFormatPromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends PromptTemplate<RunInput, PartialVariableName> {
  static lc_name(): string;
  lc_serializable: boolean;
  templateValidator?: (template: string, inputVariables: string[]) => boolean;
  renderer: (template: string, values: InputValues) => string;
  constructor(input: CustomFormatPromptTemplateInput<RunInput>);
  /**
   * Load prompt template from a template
   */
  static fromTemplate<RunInput extends InputValues = Record<string, any>>(template: string, {
    customParser,
    ...rest
  }: Omit<CustomFormatPromptTemplateInput<RunInput>, "template" | "inputVariables">): CustomFormatPromptTemplate<RunInput extends Symbol ? never : RunInput, any>;
  /**
   * Formats the prompt template with the provided values.
   * @param values The values to be used to format the prompt template.
   * @returns A promise that resolves to a string which is the formatted prompt.
   */
  format(values: TypedPromptInputValues<RunInput>): Promise<string>;
}
//#endregion
export { CustomFormatPromptTemplate, CustomFormatPromptTemplateInput };
//# sourceMappingURL=custom_format.d.ts.map