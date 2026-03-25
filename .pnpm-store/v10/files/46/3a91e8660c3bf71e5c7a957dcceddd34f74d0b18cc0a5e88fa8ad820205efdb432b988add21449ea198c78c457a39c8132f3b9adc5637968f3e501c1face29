import { VectorStore } from "../vectorstores.js";
import { Comparator, Comparison, Operation, Operator, StructuredQuery, Visitor, VisitorComparisonResult, VisitorOperationResult, VisitorStructuredQueryResult } from "./ir.js";

//#region src/structured_query/base.d.ts
/**
 * Options object for the BasicTranslator class. Specifies the allowed
 * operators and comparators.
 */
type TranslatorOpts = {
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
};
/**
 * Abstract class that provides a blueprint for creating specific
 * translator classes. Defines two abstract methods: formatFunction and
 * mergeFilters.
 */
declare abstract class BaseTranslator<T extends VectorStore = VectorStore> extends Visitor<T> {
  /**
   * Formats a given function (either an operator or a comparator) into a
   * string.
   * @param func The function to format.
   * @returns Formatted string representation of the function.
   */
  abstract formatFunction(func: Operator | Comparator): string;
  /**
   * Merges two filters into one, using a specified merge type.
   * @param defaultFilter The default filter.
   * @param generatedFilter The generated filter.
   * @param mergeType The type of merge to perform. Can be 'and', 'or', or 'replace'.
   * @param forceDefaultFilter If true, the default filter will be used even if the generated filter is not empty.
   * @returns The merged filter, or undefined if both filters are empty.
   */
  abstract mergeFilters(defaultFilter: this["VisitStructuredQueryOutput"]["filter"] | undefined, generatedFilter: this["VisitStructuredQueryOutput"]["filter"] | undefined, mergeType?: "and" | "or" | "replace", forceDefaultFilter?: boolean): this["VisitStructuredQueryOutput"]["filter"] | undefined;
}
/**
 * Class that extends the BaseTranslator class and provides concrete
 * implementations for the abstract methods. Also declares three types:
 * VisitOperationOutput, VisitComparisonOutput, and
 * VisitStructuredQueryOutput, which are used as the return types for the
 * visitOperation, visitComparison, and visitStructuredQuery methods
 * respectively.
 */
declare class BasicTranslator<T extends VectorStore = VectorStore> extends BaseTranslator<T> {
  VisitOperationOutput: VisitorOperationResult;
  VisitComparisonOutput: VisitorComparisonResult;
  VisitStructuredQueryOutput: VisitorStructuredQueryResult;
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  constructor(opts?: TranslatorOpts);
  formatFunction(func: Operator | Comparator): string;
  /**
   * Visits an operation and returns a result.
   * @param operation The operation to visit.
   * @returns The result of visiting the operation.
   */
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  /**
   * Visits a comparison and returns a result.
   * @param comparison The comparison to visit.
   * @returns The result of visiting the comparison.
   */
  visitComparison(comparison: Comparison): this["VisitComparisonOutput"];
  /**
   * Visits a structured query and returns a result.
   * @param query The structured query to visit.
   * @returns The result of visiting the structured query.
   */
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  mergeFilters(defaultFilter: VisitorStructuredQueryResult["filter"] | undefined, generatedFilter: VisitorStructuredQueryResult["filter"] | undefined, mergeType?: string, forceDefaultFilter?: boolean): VisitorStructuredQueryResult["filter"] | undefined;
}
//#endregion
export { BaseTranslator, BasicTranslator, TranslatorOpts };
//# sourceMappingURL=base.d.ts.map