import { Chroma } from "../vectorstores/chroma.js";
import { BaseTranslator, Comparator, Comparison, Operation, Operator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/structured_query/chroma.d.ts

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
declare class ChromaTranslator<T extends Chroma> extends BaseTranslator<T> {
  VisitOperationOutput: T["FilterType"];
  VisitComparisonOutput: T["FilterType"];
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  formatFunction(func: Operator | Comparator): string;
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  visitComparison(comparison: Comparison): this["VisitComparisonOutput"];
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  mergeFilters(defaultFilter: this["VisitStructuredQueryOutput"]["filter"] | undefined, generatedFilter: this["VisitStructuredQueryOutput"]["filter"] | undefined, mergeType?: "and" | "or" | "replace", forceDefaultFilter?: boolean): this["VisitStructuredQueryOutput"]["filter"] | undefined;
}
//#endregion
export { ChromaTranslator };
//# sourceMappingURL=chroma.d.ts.map