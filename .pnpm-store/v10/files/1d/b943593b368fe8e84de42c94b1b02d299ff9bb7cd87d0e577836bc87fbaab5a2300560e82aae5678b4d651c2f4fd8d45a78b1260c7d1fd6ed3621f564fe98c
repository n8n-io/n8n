const require_json = require("../utils/json.cjs");
const require_base = require("./base.cjs");
require("./json.cjs");
//#region src/output_parsers/standard_schema.ts
var StandardSchemaOutputParser = class extends require_base.BaseOutputParser {
	static lc_name() {
		return "StandardSchemaOutputParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"standard_schema"
	];
	schema;
	constructor(schema) {
		super();
		this.schema = schema;
	}
	static fromSerializableSchema(schema) {
		return new this(schema);
	}
	async parse(text) {
		try {
			const json = require_json.parseJsonMarkdown(text, JSON.parse);
			const result = await this.schema["~standard"].validate(json);
			if (result.issues) throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
			return result.value;
		} catch (e) {
			throw new require_base.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
	}
	getFormatInstructions() {
		return "";
	}
};
//#endregion
exports.StandardSchemaOutputParser = StandardSchemaOutputParser;

//# sourceMappingURL=standard_schema.cjs.map