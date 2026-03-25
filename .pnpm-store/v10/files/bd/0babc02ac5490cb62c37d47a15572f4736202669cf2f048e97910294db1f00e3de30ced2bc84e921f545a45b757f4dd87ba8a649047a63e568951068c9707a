import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { isInteropZodSchema } from "../utils/types/zod.js";
import { isSerializableSchema } from "../utils/standard_schema.js";
import { RunnableSequence } from "../runnables/base.js";
import { RunnablePassthrough } from "../runnables/passthrough.js";
import "../runnables/index.js";
import { JsonOutputParser } from "../output_parsers/json.js";
import { StandardSchemaOutputParser } from "../output_parsers/standard_schema.js";
import { StructuredOutputParser } from "../output_parsers/structured.js";
import "../output_parsers/index.js";
import { JsonOutputKeyToolsParser } from "../output_parsers/openai_tools/json_output_tools_parsers.js";
import "../utils/types/index.js";
//#region src/language_models/structured_output.ts
var structured_output_exports = /* @__PURE__ */ __exportAll({
	assembleStructuredOutputPipeline: () => assembleStructuredOutputPipeline,
	createContentParser: () => createContentParser,
	createFunctionCallingParser: () => createFunctionCallingParser
});
/**
* Creates the appropriate content-based output parser for a schema. Use this for
* jsonMode/jsonSchema methods where the LLM returns JSON text.
*
* - Zod schema -> StructuredOutputParser (Zod validation)
* - Standard schema -> StandardSchemaOutputParser (standard schema validation)
* - Plain JSON schema -> JsonOutputParser (no validation)
*/
function createContentParser(schema) {
	if (isInteropZodSchema(schema)) return StructuredOutputParser.fromZodSchema(schema);
	if (isSerializableSchema(schema)) return StandardSchemaOutputParser.fromSerializableSchema(schema);
	return new JsonOutputParser();
}
/**
* Creates the appropriate tool-calling output parser for a schema. Use this for
* function calling / tool use methods where the LLM returns structured tool calls.
*
* - Zod schema -> parser with Zod validation
* - Standard schema -> parser with standard schema validation
* - Plain JSON schema -> parser with no validation
*/
function createFunctionCallingParser(schema, keyName, ParserClass) {
	const Ctor = ParserClass ?? JsonOutputKeyToolsParser;
	if (isInteropZodSchema(schema)) return new Ctor({
		returnSingle: true,
		keyName,
		zodSchema: schema
	});
	if (isSerializableSchema(schema)) return new Ctor({
		returnSingle: true,
		keyName,
		serializableSchema: schema
	});
	return new Ctor({
		returnSingle: true,
		keyName
	});
}
/**
* Pipes an LLM through an output parser, optionally wrapping the result
* to include the raw LLM response alongside the parsed output.
*
* When `includeRaw` is true, returns `{ raw: BaseMessage, parsed: RunOutput }`.
* If parsing fails, `parsed` falls back to null.
*/
function assembleStructuredOutputPipeline(llm, outputParser, includeRaw, runName) {
	if (!includeRaw) {
		const result = llm.pipe(outputParser);
		return runName ? result.withConfig({ runName }) : result;
	}
	const parserAssign = RunnablePassthrough.assign({ parsed: (input, config) => outputParser.invoke(input.raw, config) });
	const parserNone = RunnablePassthrough.assign({ parsed: () => null });
	const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
	const result = RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
	return runName ? result.withConfig({ runName }) : result;
}
//#endregion
export { assembleStructuredOutputPipeline, createContentParser, createFunctionCallingParser, structured_output_exports };

//# sourceMappingURL=structured_output.js.map