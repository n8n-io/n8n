import { VectaraFilter, VectaraStore } from "../vectorstores/vectara.cjs";
import { BaseTranslator, Comparator, Comparison, Operation, Operator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/structured_query/vectara.d.ts
type VectaraVisitorResult = VectaraOperationResult | VectaraComparisonResult | VectaraVisitorStructuredQueryResult;
type VectaraOperationResult = String;
type VectaraComparisonResult = String;
type VectaraVisitorStructuredQueryResult = {
  filter?: {
    filter?: VectaraOperationResult | VectaraComparisonResult;
  };
};
declare class VectaraTranslator<T extends VectaraStore> extends BaseTranslator<T> {
  VisitOperationOutput: VectaraOperationResult;
  VisitComparisonOutput: VectaraComparisonResult;
  allowedOperators: Operator[];
  allowedComparators: Comparator[];
  formatFunction(func: Operator | Comparator): string;
  /**
   * Visits an operation and returns a VectaraOperationResult. The
   * operation's arguments are visited and the operator is formatted.
   * @param operation The operation to visit.
   * @returns A VectaraOperationResult.
   */
  visitOperation(operation: Operation): this["VisitOperationOutput"];
  /**
   * Visits a comparison and returns a VectaraComparisonResult. The
   * comparison's value is checked for type and the comparator is formatted.
   * Throws an error if the value type is not supported.
   * @param comparison The comparison to visit.
   * @returns A VectaraComparisonResult.
   */
  visitComparison(comparison: Comparison): this["VisitComparisonOutput"];
  /**
   * Visits a structured query and returns a VectaraStructuredQueryResult.
   * If the query has a filter, it is visited.
   * @param query The structured query to visit.
   * @returns A VectaraStructuredQueryResult.
   */
  visitStructuredQuery(query: StructuredQuery): this["VisitStructuredQueryOutput"];
  mergeFilters(defaultFilter: VectaraFilter | undefined, generatedFilter: VectaraFilter | undefined, mergeType?: string, forceDefaultFilter?: boolean): VectaraFilter | undefined;
}
//#endregion
export { VectaraComparisonResult, VectaraOperationResult, VectaraTranslator, VectaraVisitorResult, VectaraVisitorStructuredQueryResult };
//# sourceMappingURL=vectara.d.cts.map