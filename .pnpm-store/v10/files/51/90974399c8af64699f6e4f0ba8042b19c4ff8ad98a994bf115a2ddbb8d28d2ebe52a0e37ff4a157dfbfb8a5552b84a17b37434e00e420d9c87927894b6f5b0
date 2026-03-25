const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/output_parsers/structured.ts
var StructuredOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	static lc_name() {
		return "StructuredOutputParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"structured"
	];
	toJSON() {
		return this.toJSONNotImplemented();
	}
	constructor(schema) {
		super(schema);
		this.schema = schema;
	}
	/**
	* Creates a new StructuredOutputParser from a Zod schema.
	* @param schema The Zod schema which the output should match
	* @returns A new instance of StructuredOutputParser.
	*/
	static fromZodSchema(schema) {
		return new this(schema);
	}
	/**
	* Creates a new StructuredOutputParser from a set of names and
	* descriptions.
	* @param schemas An object where each key is a name and each value is a description
	* @returns A new instance of StructuredOutputParser.
	*/
	static fromNamesAndDescriptions(schemas) {
		const zodSchema = zod_v3.z.object(Object.fromEntries(Object.entries(schemas).map(([name, description]) => [name, zod_v3.z.string().describe(description)])));
		return new this(zodSchema);
	}
	/**
	* Returns a markdown code snippet with a JSON object formatted according
	* to the schema.
	* @param options Optional. The options for formatting the instructions
	* @returns A markdown code snippet with a JSON object formatted according to the schema.
	*/
	getFormatInstructions() {
		return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
${JSON.stringify((0, __langchain_core_utils_json_schema.toJsonSchema)(this.schema))}
\`\`\`
`;
	}
	/**
	* Parses the given text according to the schema.
	* @param text The text to parse
	* @returns The parsed output.
	*/
	async parse(text) {
		try {
			const json = text.includes("```") ? text.trim().split(/```(?:json)?/)[1] : text.trim();
			return await (0, __langchain_core_utils_types.interopParseAsync)(this.schema, JSON.parse(json));
		} catch {
			try {
				return await (0, __langchain_core_utils_types.interopParseAsync)(this.schema, JSON.parse(text.trim()));
			} catch (e2) {
				throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e2}`, text);
			}
		}
	}
};
/**
* A specific type of `StructuredOutputParser` that parses JSON data
* formatted as a markdown code snippet.
*/
var JsonMarkdownStructuredOutputParser = class extends StructuredOutputParser {
	static lc_name() {
		return "JsonMarkdownStructuredOutputParser";
	}
	getFormatInstructions(options) {
		const interpolationDepth = options?.interpolationDepth ?? 1;
		if (interpolationDepth < 1) throw new Error("f string interpolation depth must be at least 1");
		return `Return a markdown code snippet with a JSON object formatted to look like:\n\`\`\`json\n${this._schemaToInstruction((0, __langchain_core_utils_json_schema.toJsonSchema)(this.schema)).replaceAll("{", "{".repeat(interpolationDepth)).replaceAll("}", "}".repeat(interpolationDepth))}\n\`\`\``;
	}
	_schemaToInstruction(schemaInput, indent = 2) {
		const schema = schemaInput;
		if ("type" in schema) {
			let nullable = false;
			let type;
			if (Array.isArray(schema.type)) {
				const nullIdx = schema.type.findIndex((type$1) => type$1 === "null");
				if (nullIdx !== -1) {
					nullable = true;
					schema.type.splice(nullIdx, 1);
				}
				type = schema.type.join(" | ");
			} else type = schema.type;
			if (schema.type === "object" && schema.properties) {
				const description$1 = schema.description ? ` // ${schema.description}` : "";
				const properties = Object.entries(schema.properties).map(([key, value]) => {
					const isOptional = schema.required?.includes(key) ? "" : " (optional)";
					return `${" ".repeat(indent)}"${key}": ${this._schemaToInstruction(value, indent + 2)}${isOptional}`;
				}).join("\n");
				return `{\n${properties}\n${" ".repeat(indent - 2)}}${description$1}`;
			}
			if (schema.type === "array" && schema.items) {
				const description$1 = schema.description ? ` // ${schema.description}` : "";
				return `array[\n${" ".repeat(indent)}${this._schemaToInstruction(schema.items, indent + 2)}\n${" ".repeat(indent - 2)}] ${description$1}`;
			}
			const isNullable = nullable ? " (nullable)" : "";
			const description = schema.description ? ` // ${schema.description}` : "";
			return `${type}${description}${isNullable}`;
		}
		if ("anyOf" in schema) return schema.anyOf.map((s) => this._schemaToInstruction(s, indent)).join(`\n${" ".repeat(indent - 2)}`);
		throw new Error("unsupported schema type");
	}
	static fromZodSchema(schema) {
		return new this(schema);
	}
	static fromNamesAndDescriptions(schemas) {
		const zodSchema = zod_v3.z.object(Object.fromEntries(Object.entries(schemas).map(([name, description]) => [name, zod_v3.z.string().describe(description)])));
		return new this(zodSchema);
	}
};
/**
* A type of `StructuredOutputParser` that handles asymmetric input and
* output schemas.
*/
var AsymmetricStructuredOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	structuredInputParser;
	constructor({ inputSchema }) {
		super(...arguments);
		this.structuredInputParser = new JsonMarkdownStructuredOutputParser(inputSchema);
	}
	async parse(text) {
		let parsedInput;
		try {
			parsedInput = await this.structuredInputParser.parse(text);
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
		return this.outputProcessor(parsedInput);
	}
	getFormatInstructions() {
		return this.structuredInputParser.getFormatInstructions();
	}
};

//#endregion
exports.AsymmetricStructuredOutputParser = AsymmetricStructuredOutputParser;
exports.JsonMarkdownStructuredOutputParser = JsonMarkdownStructuredOutputParser;
exports.StructuredOutputParser = StructuredOutputParser;
//# sourceMappingURL=structured.cjs.map