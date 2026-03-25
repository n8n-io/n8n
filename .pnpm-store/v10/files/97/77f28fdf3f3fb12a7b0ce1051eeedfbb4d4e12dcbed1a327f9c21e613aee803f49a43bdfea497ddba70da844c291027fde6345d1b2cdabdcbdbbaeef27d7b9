import { MessageContent } from "../messages/base.cjs";
import { InputValues } from "../utils/types/index.cjs";

//#region src/prompts/template.d.ts
/**
 * Type that specifies the format of a template.
 */
type TemplateFormat = "f-string" | "mustache";
/**
 * Type that represents a node in a parsed format string. It can be either
 * a literal text or a variable name.
 */
type ParsedTemplateNode = {
  type: "literal";
  text: string;
} | {
  type: "variable";
  name: string;
};
/**
 * Alias for `ParsedTemplateNode` since it is the same for
 * both f-string and mustache templates.
 */
type ParsedFStringNode = ParsedTemplateNode;
declare const parseFString: (template: string) => ParsedTemplateNode[];
declare const parseMustache: (template: string) => ParsedTemplateNode[];
declare const interpolateFString: (template: string, values: InputValues) => string;
declare const interpolateMustache: (template: string, values: InputValues) => string;
/**
 * Type that represents a function that takes a template string and a set
 * of input values, and returns a string where all variables in the
 * template have been replaced with their corresponding values.
 */
type Interpolator = (template: string, values: InputValues) => string;
/**
 * Type that represents a function that takes a template string and
 * returns an array of `ParsedTemplateNode`.
 */
type Parser = (template: string) => ParsedTemplateNode[];
declare const DEFAULT_FORMATTER_MAPPING: Record<TemplateFormat, Interpolator>;
declare const DEFAULT_PARSER_MAPPING: Record<TemplateFormat, Parser>;
declare const renderTemplate: (template: string, templateFormat: TemplateFormat, inputValues: InputValues) => string;
declare const parseTemplate: (template: string, templateFormat: TemplateFormat) => ParsedTemplateNode[];
declare const checkValidTemplate: (template: MessageContent, templateFormat: TemplateFormat, inputVariables: string[]) => void;
//#endregion
export { DEFAULT_FORMATTER_MAPPING, DEFAULT_PARSER_MAPPING, ParsedFStringNode, ParsedTemplateNode, TemplateFormat, checkValidTemplate, interpolateFString, interpolateMustache, parseFString, parseMustache, parseTemplate, renderTemplate };
//# sourceMappingURL=template.d.cts.map