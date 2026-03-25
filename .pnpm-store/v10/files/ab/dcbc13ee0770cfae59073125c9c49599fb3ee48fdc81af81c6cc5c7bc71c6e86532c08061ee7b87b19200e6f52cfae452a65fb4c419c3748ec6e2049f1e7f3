import { SupabaseFilterRPCCall, SupabaseMetadata, SupabaseVectorStore } from "../vectorstores/supabase.cjs";
import { BaseTranslator, Comparator, Comparison, Operation, Operator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/structured_query/supabase.d.ts

/**
 * Represents the possible values that can be used in a comparison in a
 * structured query. It can be a string or a number.
 */
type ValueType = {
  eq: string | number;
  ne: string | number;
  lt: string | number;
  lte: string | number;
  gt: string | number;
  gte: string | number;
};
/**
 * A specialized translator designed to work with Supabase, extending the
 * BaseTranslator class. It translates structured queries into a format
 * that can be understood by the Supabase database.
 * @example
 * ```typescript
 * const selfQueryRetriever = new SelfQueryRetriever({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   vectorStore: new SupabaseVectorStore(),
 *   documentContents: "Brief summary of a movie",
 *   attributeInfo: [],
 *   structuredQueryTranslator: new SupabaseTranslator(),
 * });
 *
 * const queryResult = await selfQueryRetriever.getRelevantDocuments(
 *   "Which movies are directed by Greta Gerwig?",
 * );
 * ```
 */
declare class SupabaseTranslator<T extends SupabaseVectorStore> extends BaseTranslator<T> {
  VisitOperationOutput: SupabaseFilterRPCCall;
  VisitComparisonOutput: SupabaseFilterRPCCall;
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  formatFunction(): string;
  /**
   * Returns a function that applies the appropriate comparator operation on
   * the attribute and value provided. The function returned is used to
   * filter data in a Supabase database.
   * @param comparator The comparator to be used in the operation.
   * @returns A function that applies the comparator operation on the attribute and value provided.
   */
  getComparatorFunction<C extends Comparator>(comparator: Comparator): (attr: string, value: ValueType[C]) => SupabaseFilterRPCCall;
  /**
   * Builds a column name based on the attribute and value provided. The
   * column name is used in filtering data in a Supabase database.
   * @param attr The attribute to be used in the column name.
   * @param value The value to be used in the column name.
   * @param includeType Whether to include the data type in the column name.
   * @returns The built column name.
   */
  buildColumnName(attr: string, value: string | number, includeType?: boolean): string;
  /**
   * Visits an operation and returns a string representation of it. This is
   * used in translating a structured query into a format that can be
   * understood by Supabase.
   * @param operation The operation to be visited.
   * @returns A string representation of the operation.
   */
  visitOperationAsString(operation: Operation): string;
  /**
   * Visits an operation and returns a function that applies the operation
   * on a Supabase database. This is used in translating a structured query
   * into a format that can be understood by Supabase.
   * @param operation The operation to be visited.
   * @returns A function that applies the operation on a Supabase database.
   */
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  /**
   * Visits a comparison and returns a string representation of it. This is
   * used in translating a structured query into a format that can be
   * understood by Supabase.
   * @param comparison The comparison to be visited.
   * @returns A string representation of the comparison.
   */
  visitComparisonAsString(comparison: Comparison): string;
  /**
   * Visits a comparison and returns a function that applies the comparison
   * on a Supabase database. This is used in translating a structured query
   * into a format that can be understood by Supabase.
   * @param comparison The comparison to be visited.
   * @returns A function that applies the comparison on a Supabase database.
   */
  visitComparison(comparison: Comparison): this["VisitComparisonOutput"];
  /**
   * Visits a structured query and returns a function that applies the query
   * on a Supabase database. This is used in translating a structured query
   * into a format that can be understood by Supabase.
   * @param query The structured query to be visited.
   * @returns A function that applies the query on a Supabase database.
   */
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  /**
   * Merges two filters into one. The merged filter can be used to filter
   * data in a Supabase database.
   * @param defaultFilter The default filter to be merged.
   * @param generatedFilter The generated filter to be merged.
   * @param mergeType The type of merge to be performed. It can be 'and', 'or', or 'replace'.
   * @returns The merged filter.
   */
  mergeFilters(defaultFilter: SupabaseFilterRPCCall | SupabaseMetadata | undefined, generatedFilter: SupabaseFilterRPCCall | undefined, mergeType?: string): SupabaseFilterRPCCall | SupabaseMetadata | undefined;
}
//#endregion
export { SupabaseTranslator };
//# sourceMappingURL=supabase.d.cts.map