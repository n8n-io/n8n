Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_zod = require("../utils/types/zod.cjs");
const require_utils_standard_schema = require("../utils/standard_schema.cjs");
const require_base = require("../runnables/base.cjs");
const require_passthrough = require("../runnables/passthrough.cjs");
require("../runnables/index.cjs");
const require_json = require("../output_parsers/json.cjs");
const require_standard_schema = require("../output_parsers/standard_schema.cjs");
const require_structured = require("../output_parsers/structured.cjs");
require("../output_parsers/index.cjs");
const require_json_output_tools_parsers = require("../output_parsers/openai_tools/json_output_tools_parsers.cjs");
require("../utils/types/index.cjs");
//#region src/language_models/structured_output.ts
var structured_output_exports = /* @__PURE__ */ require_runtime.__exportAll({
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
	if (require_zod.isInteropZodSchema(schema)) return require_structured.StructuredOutputParser.fromZodSchema(schema);
	if (require_utils_standard_schema.isSerializableSchema(schema)) return require_standard_schema.StandardSchemaOutputParser.fromSerializableSchema(schema);
	return new require_json.JsonOutputParser();
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
	const Ctor = ParserClass ?? require_json_output_tools_parsers.JsonOutputKeyToolsParser;
	if (require_zod.isInteropZodSchema(schema)) return new Ctor({
		returnSingle: true,
		keyName,
		zodSchema: schema
	});
	if (require_utils_standard_schema.isSerializableSchema(schema)) return new Ctor({
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
	const parserAssign = require_passthrough.RunnablePassthrough.assign({ parsed: (input, config) => outputParser.invoke(input.raw, config) });
	const parserNone = require_passthrough.RunnablePassthrough.assign({ parsed: () => null });
	const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
	const result = require_base.RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
	return runName ? result.withConfig({ runName }) : result;
}
//#endregion
exports.assembleStructuredOutputPipeline = assembleStructuredOutputPipeline;
exports.createContentParser = createContentParser;
exports.createFunctionCallingParser = createFunctionCallingParser;
Object.defineProperty(exports, "structured_output_exports", {
	enumerable: true,
	get: function() {
		return structured_output_exports;
	}
});

//# sourceMappingURL=structured_output.cjs.map