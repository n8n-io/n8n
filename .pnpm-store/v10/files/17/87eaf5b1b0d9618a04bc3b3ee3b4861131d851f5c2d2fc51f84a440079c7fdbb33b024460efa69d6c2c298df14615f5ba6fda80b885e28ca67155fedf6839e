import { MessageContent } from "../messages/base.cjs";
import { TemplateFormat } from "./template.cjs";

//#region src/prompts/serde.d.ts
/**
 * Represents a serialized version of a prompt template. This type is used
 * to create dynamic prompts for language models. It contains an optional
 * `_type` field which, if present, is set to 'prompt'. It also includes
 * `input_variables`, an array of strings representing the variables to be
 * used in the prompt, an optional `template_format` specifying the format
 * of the template, and an optional `template` which is the actual
 * template string.
 */
type SerializedPromptTemplate = {
  _type?: "prompt";
  input_variables: string[];
  template_format?: TemplateFormat;
  template?: MessageContent;
};
/**
 * Represents a serialized version of a few-shot template. This type
 * includes an `_type` field set to 'few_shot', `input_variables` which
 * are an array of strings representing the variables to be used in the
 * template, `examples` which can be a string or an array of Example
 * objects, an optional `example_prompt` which is a
 * SerializedPromptTemplate, `example_separator` which is a string,
 * optional `prefix` and `suffix` strings, and `template_format` which
 * specifies the format of the template.
 */
type SerializedFewShotTemplate = {
  _type: "few_shot";
  input_variables: string[];
  examples: string | any[];
  example_prompt?: SerializedPromptTemplate;
  example_separator: string;
  prefix?: string;
  suffix?: string;
  template_format: TemplateFormat;
};
/**
 * Represents a serialized version of a base prompt template. This type
 * can be either a SerializedFewShotTemplate or a
 * SerializedPromptTemplate.
 */
type SerializedBasePromptTemplate = SerializedFewShotTemplate | SerializedPromptTemplate;
//#endregion
export { SerializedBasePromptTemplate, SerializedFewShotTemplate, SerializedPromptTemplate };
//# sourceMappingURL=serde.d.cts.map