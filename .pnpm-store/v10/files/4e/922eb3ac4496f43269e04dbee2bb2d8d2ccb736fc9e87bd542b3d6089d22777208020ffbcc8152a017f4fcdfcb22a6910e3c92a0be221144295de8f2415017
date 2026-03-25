import { CustomFormatPromptTemplate, CustomFormatPromptTemplateInput } from "./custom_format.cjs";
import { InputValues } from "@langchain/core/utils/types";
import * as _langchain_core_prompts0 from "@langchain/core/prompts";

//#region src/experimental/prompts/handlebars.d.ts
declare const parseHandlebars: (template: string) => _langchain_core_prompts0.ParsedTemplateNode[];
declare const interpolateHandlebars: (template: string, values: InputValues) => string;
type HandlebarsPromptTemplateInput<RunInput extends InputValues> = CustomFormatPromptTemplateInput<RunInput>;
declare class HandlebarsPromptTemplate<
// eslint-disable-next-line @typescript-eslint/no-explicit-any
RunInput extends InputValues = any> extends CustomFormatPromptTemplate<RunInput> {
  static lc_name(): string;
  /**
   * Load prompt template from a template
   */
  static fromTemplate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunInput extends InputValues = Record<string, any>>(template: string, params?: Omit<HandlebarsPromptTemplateInput<RunInput>, "template" | "inputVariables" | "customParser" | "templateValidator" | "renderer">): CustomFormatPromptTemplate<RunInput extends Symbol ? never : RunInput, any>;
}
//#endregion
export { HandlebarsPromptTemplate, HandlebarsPromptTemplateInput, interpolateHandlebars, parseHandlebars };
//# sourceMappingURL=handlebars.d.cts.map