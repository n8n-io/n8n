import { Comparator, Comparison, Operation, Operator } from "@langchain/core/structured_query";

//#region src/chains/query_constructor/parser.d.ts

/**
 * A type representing the possible types that can be traversed in an
 * expression.
 */
type TraverseType = boolean | Operation | Comparison | string | number | {
  [key: string]: TraverseType;
} | TraverseType[];
/**
 * A class for transforming and parsing query expressions.
 */
declare class QueryTransformer {
  allowedComparators: Comparator[];
  allowedOperators: Operator[];
  constructor(allowedComparators?: Comparator[], allowedOperators?: Operator[]);
  /**
   * Matches a function name to a comparator or operator. Throws an error if
   * the function name is unknown or not allowed.
   * @param funcName The function name to match.
   * @returns The matched function name.
   */
  private matchFunctionName;
  /**
   * Transforms a parsed expression into an operation or comparison. Throws
   * an error if the parsed expression is not supported.
   * @param parsed The parsed expression to transform.
   * @returns The transformed operation or comparison.
   */
  private transform;
  /**
   * Parses an expression and returns the transformed operation or
   * comparison. Throws an error if the expression cannot be parsed.
   * @param expression The expression to parse.
   * @returns A Promise that resolves to the transformed operation or comparison.
   */
  parse(expression: string): Promise<Operation | Comparison>;
}
//#endregion
export { QueryTransformer, TraverseType };
//# sourceMappingURL=parser.d.ts.map