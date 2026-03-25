import { parseJsonMarkdown } from "../utils/json.js";
import { BaseOutputParser, OutputParserException } from "./base.js";
import "./json.js";
//#region src/output_parsers/standard_schema.ts
var StandardSchemaOutputParser = class extends BaseOutputParser {
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
			const json = parseJsonMarkdown(text, JSON.parse);
			const result = await this.schema["~standard"].validate(json);
			if (result.issues) throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
			return result.value;
		} catch (e) {
			throw new OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
	}
	getFormatInstructions() {
		return "";
	}
};
//#endregion
export { StandardSchemaOutputParser };

//# sourceMappingURL=standard_schema.js.map