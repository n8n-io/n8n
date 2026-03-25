import { WeaviateStore } from "./vectorstores.cjs";
import { FilterValue } from "weaviate-client";
import { BaseTranslator, Comparator, Comparison, Operation, Operator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/translator.d.ts
type WeaviateOperatorValues = {
  value: string | number | boolean;
};
type WeaviateOperatorKeys = keyof WeaviateOperatorValues;
type ExclusiveOperatorValue = { [L in WeaviateOperatorKeys]: { [key in L]: WeaviateOperatorValues[key] } & Omit<{ [key in WeaviateOperatorKeys]?: never }, L> }[WeaviateOperatorKeys];
type WeaviateVisitorResult = WeaviateOperationResult | WeaviateComparisonResult | WeaviateStructuredQueryResult;
type WeaviateOperationResult = {
  operator: string;
  filters: WeaviateVisitorResult[];
  value: null;
};
type WeaviateComparisonResult = {
  target: {
    property: string;
  };
  operator: string;
} & ExclusiveOperatorValue;
type WeaviateStructuredQueryResult = {
  filter?: WeaviateComparisonResult | WeaviateOperationResult;
};
/**
 * A class that translates or converts data into a format that can be used
 * with Weaviate, a vector search engine. It extends the `BaseTranslator`
 * class and provides specific implementation for Weaviate.
 * @example
 * ```typescript
 * const selfQueryRetriever = new SelfQueryRetriever({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   vectorStore: new WeaviateStore(),
 *   documentContents: "Brief summary of a movie",
 *   attributeInfo: [],
 *   structuredQueryTranslator: new WeaviateTranslator(),
 * });
 *
 * const relevantDocuments = await selfQueryRetriever.getRelevantDocuments(
 *   "Which movies are rated higher than 8.5?",
 * );
 * ```
 */
declare class WeaviateTranslator<T extends WeaviateStore> extends BaseTranslator<T> {
  VisitOperationOutput: WeaviateOperationResult;
  VisitComparisonOutput: WeaviateComparisonResult;
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  /**
   * Formats the given function into a string representation. Throws an
   * error if the function is not a known comparator or operator, or if it
   * is not allowed.
   * @param func The function to format, which can be an Operator or Comparator.
   * @returns A string representation of the function.
   */
  formatFunction(func: Operator | Comparator): string;
  /**
   * Visits an operation and returns a WeaviateOperationResult. The
   * operation's arguments are visited and the operator is formatted.
   * @param operation The operation to visit.
   * @returns A WeaviateOperationResult.
   */
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  /**
   * Visits a comparison and returns a WeaviateComparisonResult. The
   * comparison's value is checked for type and the comparator is formatted.
   * Throws an error if the value type is not supported.
   * @param comparison The comparison to visit.
   * @returns A WeaviateComparisonResult.
   */
  visitComparison(comparison: Comparison): WeaviateComparisonResult;
  /**
   * Visits a structured query and returns a WeaviateStructuredQueryResult.
   * If the query has a filter, it is visited.
   * @param query The structured query to visit.
   * @returns A WeaviateStructuredQueryResult.
   */
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  /**
   * Merges two filters into one. If both filters are empty, returns
   * undefined. If one filter is empty or the merge type is 'replace',
   * returns the other filter. If the merge type is 'and' or 'or', returns a
   * new filter with the merged results. Throws an error for unknown merge
   * types.
   * @param defaultFilter The default filter to merge.
   * @param generatedFilter The generated filter to merge.
   * @param mergeType The type of merge to perform. Can be 'and', 'or', or 'replace'. Defaults to 'and'.
   * @returns A merged FilterValue, or undefined if both filters are empty.
   */
  mergeFilters(defaultFilter: FilterValue | undefined, generatedFilter: FilterValue | undefined, mergeType?: string): FilterValue | undefined;
}
//#endregion
export { WeaviateComparisonResult, WeaviateOperationResult, WeaviateStructuredQueryResult, WeaviateTranslator, WeaviateVisitorResult };
//# sourceMappingURL=translator.d.cts.map