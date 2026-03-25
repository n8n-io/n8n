const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_structured_query = require_rolldown_runtime.__toESM(require("@langchain/core/structured_query"));

//#region src/translator.ts
/**
* Specialized translator class that extends the BasicTranslator. It is
* designed to work with PineconeStore, a type of vector store in
* LangChain. The class is initialized with a set of allowed operators and
* comparators, which are used in the translation process to construct
* queries and compare results.
* @example
* ```typescript
* const selfQueryRetriever = SelfQueryRetriever.fromLLM({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   vectorStore: new PineconeStore(),
*   documentContents: "Brief summary of a movie",
*   attributeInfo: [],
*   structuredQueryTranslator: new PineconeTranslator(),
* });
*
* const queryResult = await selfQueryRetriever.getRelevantDocuments(
*   "Which movies are directed by Greta Gerwig?",
* );
* ```
*/
var PineconeTranslator = class extends __langchain_core_structured_query.BasicTranslator {
	constructor() {
		super({
			allowedOperators: [__langchain_core_structured_query.Operators.and, __langchain_core_structured_query.Operators.or],
			allowedComparators: [
				__langchain_core_structured_query.Comparators.eq,
				__langchain_core_structured_query.Comparators.ne,
				__langchain_core_structured_query.Comparators.gt,
				__langchain_core_structured_query.Comparators.gte,
				__langchain_core_structured_query.Comparators.lt,
				__langchain_core_structured_query.Comparators.lte
			]
		});
	}
};

//#endregion
exports.PineconeTranslator = PineconeTranslator;
//# sourceMappingURL=translator.cjs.map