import { VectorStoreInterface } from "@langchain/core/vectorstores";
import { BasicTranslator } from "@langchain/core/structured_query";

//#region src/translator.d.ts

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
declare class PineconeTranslator<T extends VectorStoreInterface> extends BasicTranslator<T> {
  constructor();
}
//#endregion
export { PineconeTranslator };
//# sourceMappingURL=translator.d.ts.map