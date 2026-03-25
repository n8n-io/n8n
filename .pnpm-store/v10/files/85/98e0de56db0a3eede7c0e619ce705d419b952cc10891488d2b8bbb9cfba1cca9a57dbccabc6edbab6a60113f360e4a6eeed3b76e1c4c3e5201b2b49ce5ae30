import { __export } from "../../_virtual/rolldown_runtime.js";
import { AsymmetricStructuredOutputParser } from "../../output_parsers/structured.js";
import { QueryTransformer } from "./parser.js";
import { DEFAULT_EXAMPLES, DEFAULT_PREFIX, DEFAULT_SCHEMA, DEFAULT_SUFFIX, EXAMPLE_PROMPT } from "./prompt.js";
import { FewShotPromptTemplate, interpolateFString } from "@langchain/core/prompts";
import { z } from "zod/v3";
import { Comparators, Operators, StructuredQuery } from "@langchain/core/structured_query";

//#region src/chains/query_constructor/index.ts
var query_constructor_exports = {};
__export(query_constructor_exports, {
	AttributeInfo: () => AttributeInfo,
	DEFAULT_EXAMPLES: () => DEFAULT_EXAMPLES,
	DEFAULT_PREFIX: () => DEFAULT_PREFIX,
	DEFAULT_SCHEMA: () => DEFAULT_SCHEMA,
	DEFAULT_SUFFIX: () => DEFAULT_SUFFIX,
	EXAMPLE_PROMPT: () => EXAMPLE_PROMPT,
	QueryTransformer: () => QueryTransformer,
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
const queryInputSchema = /* @__PURE__ */ z.object({
	query: /* @__PURE__ */ z.string().describe("text string to compare to document contents"),
	filter: /* @__PURE__ */ z.string().optional().describe("logical condition statement for filtering documents")
});
/**
* A class that extends AsymmetricStructuredOutputParser to parse
* structured query output.
*/
var StructuredQueryOutputParser = class StructuredQueryOutputParser extends AsymmetricStructuredOutputParser {
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
		this.queryTransformer = new QueryTransformer(allowedComparators, allowedOperators);
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
		if (filter === "NO_FILTER" || filter === void 0) return new StructuredQuery(query);
		else {
			const parsedFilter = await this.queryTransformer.parse(filter);
			return new StructuredQuery(query, parsedFilter);
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
const defaultExample = DEFAULT_EXAMPLES.map((EXAMPLE) => EXAMPLE);
function _getPrompt(documentContents, attributeInfo, allowedComparators, allowedOperators, examples = defaultExample) {
	const myAllowedComparators = allowedComparators ?? Object.values(Comparators);
	const myAllowedOperators = allowedOperators ?? Object.values(Operators);
	const attributeJSON = formatAttributeInfo(attributeInfo);
	const schema = interpolateFString(DEFAULT_SCHEMA, {
		allowed_comparators: myAllowedComparators.join(" | "),
		allowed_operators: myAllowedOperators.join(" | ")
	});
	const prefix = interpolateFString(DEFAULT_PREFIX, { schema });
	const suffix = interpolateFString(DEFAULT_SUFFIX, {
		i: examples.length + 1,
		content: documentContents,
		attributes: attributeJSON
	});
	const outputParser = StructuredQueryOutputParser.fromComponents(allowedComparators, allowedOperators);
	return new FewShotPromptTemplate({
		examples,
		examplePrompt: EXAMPLE_PROMPT,
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
export { AttributeInfo, DEFAULT_EXAMPLES, DEFAULT_PREFIX, DEFAULT_SCHEMA, DEFAULT_SUFFIX, EXAMPLE_PROMPT, QueryTransformer, StructuredQueryOutputParser, formatAttributeInfo, loadQueryConstructorRunnable, query_constructor_exports };
//# sourceMappingURL=index.js.map