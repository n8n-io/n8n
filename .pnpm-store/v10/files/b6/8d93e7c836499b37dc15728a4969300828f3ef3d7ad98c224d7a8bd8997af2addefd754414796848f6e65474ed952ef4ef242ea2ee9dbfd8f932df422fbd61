const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_structured = require('../../output_parsers/structured.cjs');
const require_parser = require('./parser.cjs');
const require_prompt = require('./prompt.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/chains/query_constructor/index.ts
var query_constructor_exports = {};
require_rolldown_runtime.__export(query_constructor_exports, {
	AttributeInfo: () => AttributeInfo,
	DEFAULT_EXAMPLES: () => require_prompt.DEFAULT_EXAMPLES,
	DEFAULT_PREFIX: () => require_prompt.DEFAULT_PREFIX,
	DEFAULT_SCHEMA: () => require_prompt.DEFAULT_SCHEMA,
	DEFAULT_SUFFIX: () => require_prompt.DEFAULT_SUFFIX,
	EXAMPLE_PROMPT: () => require_prompt.EXAMPLE_PROMPT,
	QueryTransformer: () => require_parser.QueryTransformer,
	StructuredQueryOutputParser: () => StructuredQueryOutputParser,
	formatAttributeInfo: () => formatAttributeInfo,
	loadQueryConstructorRunnable: () => loadQueryConstructorRunnable
});
/**
* A simple data structure that holds information about an attribute. It
* is typically used to provide metadata about attributes in other classes
* or data structures within the LangChain framework.
*/
var AttributeInfo = class {
	constructor(name, type, description) {
		this.name = name;
		this.type = type;
		this.description = description;
	}
};
const queryInputSchema = /* @__PURE__ */ zod_v3.z.object({
	query: /* @__PURE__ */ zod_v3.z.string().describe("text string to compare to document contents"),
	filter: /* @__PURE__ */ zod_v3.z.string().optional().describe("logical condition statement for filtering documents")
});
/**
* A class that extends AsymmetricStructuredOutputParser to parse
* structured query output.
*/
var StructuredQueryOutputParser = class StructuredQueryOutputParser extends require_structured.AsymmetricStructuredOutputParser {
	lc_namespace = [
		"langchain",
		"chains",
		"query_constructor"
	];
	queryTransformer;
	constructor(fields) {
		super({
			...fields,
			inputSchema: queryInputSchema
		});
		const { allowedComparators, allowedOperators } = fields;
		this.queryTransformer = new require_parser.QueryTransformer(allowedComparators, allowedOperators);
	}
	/**
	* Processes the output of a structured query.
	* @param query The query string.
	* @param filter The filter condition.
	* @returns A Promise that resolves to a StructuredQuery instance.
	*/
	async outputProcessor({ query, filter }) {
		let myQuery = query;
		if (myQuery.length === 0) myQuery = " ";
		if (filter === "NO_FILTER" || filter === void 0) return new __langchain_core_structured_query.StructuredQuery(query);
		else {
			const parsedFilter = await this.queryTransformer.parse(filter);
			return new __langchain_core_structured_query.StructuredQuery(query, parsedFilter);
		}
	}
	/**
	* Creates a new StructuredQueryOutputParser instance from the provided
	* components.
	* @param allowedComparators An array of allowed Comparator instances.
	* @param allowedOperators An array of allowed Operator instances.
	* @returns A new StructuredQueryOutputParser instance.
	*/
	static fromComponents(allowedComparators = [], allowedOperators = []) {
		return new StructuredQueryOutputParser({
			allowedComparators,
			allowedOperators
		});
	}
};
function formatAttributeInfo(info) {
	const infoObj = info.reduce((acc, attr) => {
		acc[attr.name] = {
			type: attr.type,
			description: attr.description
		};
		return acc;
	}, {});
	return JSON.stringify(infoObj, null, 2).replaceAll("{", "{{").replaceAll("}", "}}");
}
const defaultExample = require_prompt.DEFAULT_EXAMPLES.map((EXAMPLE) => EXAMPLE);
function _getPrompt(documentContents, attributeInfo, allowedComparators, allowedOperators, examples = defaultExample) {
	const myAllowedComparators = allowedComparators ?? Object.values(__langchain_core_structured_query.Comparators);
	const myAllowedOperators = allowedOperators ?? Object.values(__langchain_core_structured_query.Operators);
	const attributeJSON = formatAttributeInfo(attributeInfo);
	const schema = (0, __langchain_core_prompts.interpolateFString)(require_prompt.DEFAULT_SCHEMA, {
		allowed_comparators: myAllowedComparators.join(" | "),
		allowed_operators: myAllowedOperators.join(" | ")
	});
	const prefix = (0, __langchain_core_prompts.interpolateFString)(require_prompt.DEFAULT_PREFIX, { schema });
	const suffix = (0, __langchain_core_prompts.interpolateFString)(require_prompt.DEFAULT_SUFFIX, {
		i: examples.length + 1,
		content: documentContents,
		attributes: attributeJSON
	});
	const outputParser = StructuredQueryOutputParser.fromComponents(allowedComparators, allowedOperators);
	return new __langchain_core_prompts.FewShotPromptTemplate({
		examples,
		examplePrompt: require_prompt.EXAMPLE_PROMPT,
		inputVariables: ["query"],
		suffix,
		prefix,
		outputParser
	});
}
function loadQueryConstructorRunnable(opts) {
	const prompt = _getPrompt(opts.documentContents, opts.attributeInfo, opts.allowedComparators, opts.allowedOperators, opts.examples);
	const outputParser = StructuredQueryOutputParser.fromComponents(opts.allowedComparators, opts.allowedOperators);
	return prompt.pipe(opts.llm).pipe(outputParser);
}

//#endregion
exports.AttributeInfo = AttributeInfo;
exports.DEFAULT_EXAMPLES = require_prompt.DEFAULT_EXAMPLES;
exports.DEFAULT_PREFIX = require_prompt.DEFAULT_PREFIX;
exports.DEFAULT_SCHEMA = require_prompt.DEFAULT_SCHEMA;
exports.DEFAULT_SUFFIX = require_prompt.DEFAULT_SUFFIX;
exports.EXAMPLE_PROMPT = require_prompt.EXAMPLE_PROMPT;
exports.QueryTransformer = require_parser.QueryTransformer;
exports.StructuredQueryOutputParser = StructuredQueryOutputParser;
exports.formatAttributeInfo = formatAttributeInfo;
exports.loadQueryConstructorRunnable = loadQueryConstructorRunnable;
Object.defineProperty(exports, 'query_constructor_exports', {
  enumerable: true,
  get: function () {
    return query_constructor_exports;
  }
});
//# sourceMappingURL=index.cjs.map