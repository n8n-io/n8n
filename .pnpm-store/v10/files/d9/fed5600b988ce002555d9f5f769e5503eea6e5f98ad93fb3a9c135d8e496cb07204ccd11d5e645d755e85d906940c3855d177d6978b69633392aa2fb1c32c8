import { ChatGeneration, Generation } from "../outputs.js";
import { Operation } from "../utils/fast-json-patch/src/core.js";
import { BaseCumulativeTransformOutputParser, BaseCumulativeTransformOutputParserInput } from "./transform.js";

//#region src/output_parsers/xml.d.ts
declare const XML_FORMAT_INSTRUCTIONS = "The output should be formatted as a XML file.\n1. Output should conform to the tags below. \n2. If tags are not given, make them on your own.\n3. Remember to always open and close all the tags.\n\nAs an example, for the tags [\"foo\", \"bar\", \"baz\"]:\n1. String \"<foo>\n   <bar>\n      <baz></baz>\n   </bar>\n</foo>\" is a well-formatted instance of the schema. \n2. String \"<foo>\n   <bar>\n   </foo>\" is a badly-formatted instance.\n3. String \"<foo>\n   <tag>\n   </tag>\n</foo>\" is a badly-formatted instance.\n\nHere are the output tags:\n```\n{tags}\n```";
interface XMLOutputParserFields extends BaseCumulativeTransformOutputParserInput {
  /**
   * Optional list of tags that the output should conform to.
   * Only used in formatting of the prompt.
   */
  tags?: string[];
}
type Content = string | undefined | Array<{
  [key: string]: Content;
}>;
type XMLResult = {
  [key: string]: Content;
};
declare class XMLOutputParser extends BaseCumulativeTransformOutputParser<XMLResult> {
  tags?: string[];
  constructor(fields?: XMLOutputParserFields);
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  protected _diff(prev: unknown | undefined, next: unknown): Operation[] | undefined;
  parsePartialResult(generations: ChatGeneration[] | Generation[]): Promise<XMLResult | undefined>;
  parse(text: string): Promise<XMLResult>;
  getFormatInstructions(): string;
}
declare function parseXMLMarkdown(s: string): XMLResult;
//#endregion
export { Content, XMLOutputParser, XMLOutputParserFields, XMLResult, XML_FORMAT_INSTRUCTIONS, parseXMLMarkdown };
//# sourceMappingURL=xml.d.ts.map