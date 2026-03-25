import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseTranslator, Comparators, Operators, castValue, isFilterEmpty } from "@langchain/core/structured_query";

//#region src/structured_query/chroma.ts
var chroma_exports = {};
__export(chroma_exports, { ChromaTranslator: () => ChromaTranslator });
/**
* Specialized translator for the Chroma vector database. It extends the
* BasicTranslator class and translates internal query language elements
* to valid filters. The class defines a subset of allowed logical
* operators and comparators that can be used in the translation process.
* @example
* ```typescript
* const chromaTranslator = new ChromaTranslator();
* const selfQueryRetriever = new SelfQueryRetriever({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   vectorStore: new Chroma(),
*   documentContents: "Brief summary of a movie",
*   attributeInfo: [],
*   structuredQueryTranslator: chromaTranslator,
* });
*
* const relevantDocuments = await selfQueryRetriever.getRelevantDocuments(
*   "Which movies are directed by Greta Gerwig?",
* );
* ```
*/
var ChromaTranslator = class extends BaseTranslator {
	allowedOperators = [Operators.and, Operators.or];
	allowedComparators = [
		Comparators.eq,
		Comparators.ne,
		Comparators.gt,
		Comparators.gte,
		Comparators.lt,
		Comparators.lte
	];
	formatFunction(func) {
		if (func in Comparators) {
			if (this.allowedComparators.length > 0 && this.allowedComparators.indexOf(func) === -1) throw new Error(`Comparator ${func} not allowed. Allowed comparators: ${this.allowedComparators.join(", ")}`);
		} else if (func in Operators) {
			if (this.allowedOperators.length > 0 && this.allowedOperators.indexOf(func) === -1) throw new Error(`Operator ${func} not allowed. Allowed operators: ${this.allowedOperators.join(", ")}`);
		} else throw new Error("Unknown comparator or operator");
		return `$${func}`;
	}
	visitOperation(operation) {
		const args = operation.args?.map((arg) => arg.accept(this));
		return { [this.formatFunction(operation.operator)]: args };
	}
	visitComparison(comparison) {
		return { [comparison.attribute]: { [this.formatFunction(comparison.comparator)]: castValue(comparison.value) } };
	}
	visitStructuredQuery(query) {
		let nextArg = {};
		if (query.filter) nextArg = { filter: query.filter.accept(this) };
		return nextArg;
	}
	mergeFilters(defaultFilter, generatedFilter, mergeType = "and", forceDefaultFilter = false) {
		if (isFilterEmpty(defaultFilter) && isFilterEmpty(generatedFilter)) return void 0;
		if (isFilterEmpty(defaultFilter) || mergeType === "replace") {
			if (isFilterEmpty(generatedFilter)) return void 0;
			return generatedFilter;
		}
		if (isFilterEmpty(generatedFilter)) {
			if (forceDefaultFilter) return defaultFilter;
			if (mergeType === "and") return void 0;
			return defaultFilter;
		}
		if (mergeType === "and") return { $and: [defaultFilter, generatedFilter] };
		else if (mergeType === "or") return { $or: [defaultFilter, generatedFilter] };
		else throw new Error("Unknown merge type");
	}
};

//#endregion
export { ChromaTranslator, chroma_exports };
//# sourceMappingURL=chroma.js.map