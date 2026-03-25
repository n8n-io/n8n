import { ArrayExpression, BooleanLiteral, CallExpression, ExpressionNode, ExpressionStatement, Identifier, MemberExpression, NumericLiteral, ObjectExpression, ParseFunction, Program, PropertyAssignment, StringLiteral } from "../../types/expression-parser.js";

//#region src/output_parsers/expression_type_handlers/base.d.ts

/**
 * Abstract class for handling nodes in an expression language. Subclasses
 * must implement the `accepts` and `handle` methods.
 */
declare abstract class NodeHandler {
  protected parentHandler?: NodeHandler | undefined;
  constructor(parentHandler?: NodeHandler | undefined);
  /**
   * Determines whether the given node is acceptable.
   * @param node The node to be checked.
   * @returns A Promise that resolves to either the node itself or a boolean indicating whether the node is acceptable.
   */
  abstract accepts(node: ExpressionNode): Promise<ExpressionNode | boolean>;
  /**
   * Handles the given node. The specifics of how the node is handled are
   * determined by the subclass implementation.
   * @param node The node to be handled.
   * @returns A Promise that resolves to the result of handling the node.
   */
  abstract handle(node: ExpressionNode): Promise<any>;
}
/**
 * Utility class for parsing Abstract Syntax Trees (ASTs). Contains
 * methods for identifying the type of a given node and a method for
 * importing and generating a parser using the Peggy library.
 */
declare class ASTParser {
  static astParseInstance: ParseFunction;
  /**
   * Imports and generates a parser using the Peggy library.
   * @returns A Promise that resolves to the parser instance.
   */
  static importASTParser(): Promise<ParseFunction>;
  /**
   * Checks if the given node is a Program node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a Program node.
   */
  static isProgram(node: ExpressionNode): node is Program;
  /**
   * Checks if the given node is an ExpressionStatement node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is an ExpressionStatement node.
   */
  static isExpressionStatement(node: ExpressionNode): node is ExpressionStatement;
  /**
   * Checks if the given node is a CallExpression node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a CallExpression node.
   */
  static isCallExpression(node: ExpressionNode): node is CallExpression;
  /**
   * Checks if the given node is a StringLiteral node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a StringLiteral node.
   */
  static isStringLiteral(node: ExpressionNode): node is StringLiteral;
  /**
   * Checks if the given node is a NumericLiteral node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a NumericLiteral node.
   */
  static isNumericLiteral(node: ExpressionNode): node is NumericLiteral;
  /**
   * Checks if the given node is a BooleanLiteral node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a BooleanLiteral node.
   */
  static isBooleanLiteral(node: ExpressionNode): node is BooleanLiteral;
  /**
   * Checks if the given node is an Identifier node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is an Identifier node.
   */
  static isIdentifier(node: ExpressionNode): node is Identifier;
  /**
   * Checks if the given node is an ObjectExpression node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is an ObjectExpression node.
   */
  static isObjectExpression(node: ExpressionNode): node is ObjectExpression;
  /**
   * Checks if the given node is an ArrayExpression node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is an ArrayExpression node.
   */
  static isArrayExpression(node: ExpressionNode): node is ArrayExpression;
  /**
   * Checks if the given node is a PropertyAssignment node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a PropertyAssignment node.
   */
  static isPropertyAssignment(node: ExpressionNode): node is PropertyAssignment;
  /**
   * Checks if the given node is a MemberExpression node.
   * @param node The node to be checked.
   * @returns A boolean indicating whether the node is a MemberExpression node.
   */
  static isMemberExpression(node: ExpressionNode): node is MemberExpression;
}
//#endregion
export { ASTParser, NodeHandler };
//# sourceMappingURL=base.d.ts.map