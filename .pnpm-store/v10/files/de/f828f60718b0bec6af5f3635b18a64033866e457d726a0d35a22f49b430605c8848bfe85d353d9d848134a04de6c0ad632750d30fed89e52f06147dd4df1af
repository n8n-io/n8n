import { Document } from "../documents/document.js";
import { Comparator, Comparison, Operation, Operator, StructuredQuery } from "./ir.js";
import { BaseTranslator } from "./base.js";

//#region src/structured_query/functional.d.ts
/**
 * A type alias for an object that maps comparison operators to string or
 * number values. This is used in the comparison functions to determine
 * the result of a comparison operation.
 */
type ValueType = {
  eq: string | number | boolean;
  ne: string | number | boolean;
  lt: string | number;
  lte: string | number;
  gt: string | number;
  gte: string | number;
};
/**
 * A type alias for a function that takes a `Document` as an argument and
 * returns a boolean. This function is used as a filter for documents.
 */
type FunctionFilter = (document: Document) => boolean;
/**
 * A class that extends `BaseTranslator` to translate structured queries
 * into functional filters.
 * @example
 * ```typescript
 * const functionalTranslator = new FunctionalTranslator();
 * const relevantDocuments = await functionalTranslator.getRelevantDocuments(
 *   "Which movies are rated higher than 8.5?",
 * );
 * ```
 */
declare class FunctionalTranslator extends BaseTranslator {
  VisitOperationOutput: FunctionFilter;
  VisitComparisonOutput: FunctionFilter;
  VisitStructuredQueryOutput: {
    filter: FunctionFilter;
  } | {
    [k: string]: never;
  };
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  formatFunction(): string;
  /**
   * Returns the allowed comparators for a given data type.
   * @param input The input value to get the allowed comparators for.
   * @returns An array of allowed comparators for the input data type.
   */
  getAllowedComparatorsForType(inputType: string): Comparator[];
  /**
   * Returns a function that performs a comparison based on the provided
   * comparator.
   * @param comparator The comparator to base the comparison function on.
   * @returns A function that takes two arguments and returns a boolean based on the comparison.
   */
  getComparatorFunction<C extends Comparator>(comparator: Comparator): (a: string | number, b: ValueType[C]) => boolean;
  /**
   * Returns a function that performs an operation based on the provided
   * operator.
   * @param operator The operator to base the operation function on.
   * @returns A function that takes two boolean arguments and returns a boolean based on the operation.
   */
  getOperatorFunction(operator: Operator): (a: boolean, b: boolean) => boolean;
  /**
   * Visits the operation part of a structured query and translates it into
   * a functional filter.
   * @param operation The operation part of a structured query.
   * @returns A function that takes a `Document` as an argument and returns a boolean based on the operation.
   */
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  /**
   * Visits the comparison part of a structured query and translates it into
   * a functional filter.
   * @param comparison The comparison part of a structured query.
   * @returns A function that takes a `Document` as an argument and returns a boolean based on the comparison.
   */
  visitComparison(comparison: Comparison<string | number | boolean>): this["VisitComparisonOutput"];
  /**
   * Visits a structured query and translates it into a functional filter.
   * @param query The structured query to translate.
   * @returns An object containing a `filter` property, which is a function that takes a `Document` as an argument and returns a boolean based on the structured query.
   */
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  /**
   * Merges two filters into one, based on the specified merge type.
   * @param defaultFilter The default filter function.
   * @param generatedFilter The generated filter function.
   * @param mergeType The type of merge to perform. Can be 'and', 'or', or 'replace'. Default is 'and'.
   * @returns A function that takes a `Document` as an argument and returns a boolean based on the merged filters, or `undefined` if both filters are empty.
   */
  mergeFilters(defaultFilter: FunctionFilter, generatedFilter: FunctionFilter, mergeType?: string): FunctionFilter | undefined;
}
//#endregion
export { FunctionFilter, FunctionalTranslator };
//# sourceMappingURL=functional.d.ts.map