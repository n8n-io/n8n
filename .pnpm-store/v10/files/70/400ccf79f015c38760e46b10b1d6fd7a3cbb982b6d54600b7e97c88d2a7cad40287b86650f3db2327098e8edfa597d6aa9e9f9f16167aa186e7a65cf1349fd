import { BaseMessage } from "../messages/base.js";
import { SerializableSchema } from "../utils/standard_schema.js";
import { InteropZodType } from "../utils/types/zod.js";
import { Runnable } from "../runnables/base.js";
import { BaseLanguageModelInput } from "./base.js";
import { BaseLLMOutputParser, BaseOutputParser } from "../output_parsers/base.js";
//#region src/language_models/structured_output.d.ts
/**
 * Creates the appropriate content-based output parser for a schema. Use this for
 * jsonMode/jsonSchema methods where the LLM returns JSON text.
 *
 * - Zod schema -> StructuredOutputParser (Zod validation)
 * - Standard schema -> StandardSchemaOutputParser (standard schema validation)
 * - Plain JSON schema -> JsonOutputParser (no validation)
 */
declare function createContentParser<RunOutput extends Record<string, any> = Record<string, any>>(schema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>): BaseOutputParser<RunOutput>;
type FunctionCallingParserConstructor<T extends Record<string, any> = Record<string, any>> = new (params: {
  keyName: string;
  returnSingle?: boolean;
  zodSchema?: InteropZodType<T>;
  serializableSchema?: SerializableSchema<T>;
}) => BaseLLMOutputParser<T>;
/**
 * Creates the appropriate tool-calling output parser for a schema. Use this for
 * function calling / tool use methods where the LLM returns structured tool calls.
 *
 * - Zod schema -> parser with Zod validation
 * - Standard schema -> parser with standard schema validation
 * - Plain JSON schema -> parser with no validation
 */
declare function createFunctionCallingParser<RunOutput extends Record<string, any> = Record<string, any>>(schema: InteropZodType<RunOutput> | SerializableSchema<RunOutput> | Record<string, any>, keyName: string, ParserClass?: FunctionCallingParserConstructor<RunOutput>): BaseLLMOutputParser<RunOutput>;
/**
 * Pipes an LLM through an output parser, optionally wrapping the result
 * to include the raw LLM response alongside the parsed output.
 *
 * When `includeRaw` is true, returns `{ raw: BaseMessage, parsed: RunOutput }`.
 * If parsing fails, `parsed` falls back to null.
 */
declare function assembleStructuredOutputPipeline<RunOutput extends Record<string, any> = Record<string, any>>(llm: Runnable<BaseLanguageModelInput>, outputParser: Runnable<any, RunOutput>, includeRaw?: boolean, runName?: string): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
  raw: BaseMessage;
  parsed: RunOutput;
}>;
//#endregion
export { assembleStructuredOutputPipeline, createContentParser, createFunctionCallingParser };
//# sourceMappingURL=structured_output.d.ts.map