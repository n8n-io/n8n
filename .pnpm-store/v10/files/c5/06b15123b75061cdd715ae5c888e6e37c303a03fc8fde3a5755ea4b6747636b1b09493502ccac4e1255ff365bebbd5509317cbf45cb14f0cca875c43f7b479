import { BasicTranslator, Comparators, Operators } from "@langchain/core/structured_query";

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
var PineconeTranslator = class extends BasicTranslator {
	constructor() {
		super({
			allowedOperators: [Operators.and, Operators.or],
			allowedComparators: [
				Comparators.eq,
				Comparators.ne,
				Comparators.gt,
				Comparators.gte,
				Comparators.lt,
				Comparators.lte
			]
		});
	}
};

//#endregion
export { PineconeTranslator };
//# sourceMappingURL=translator.js.map