import { ParsedType } from "./types.js";
import { CallExpression, ExpressionNode } from "../../types/expression-parser.js";
import { NodeHandler } from "./base.js";

//#region src/output_parsers/expression_type_handlers/factory.d.ts

/**
 * The MasterHandler class is responsible for managing a collection of
 * node handlers in the LangChain Expression Language. Each node handler
 * is capable of handling a specific type of node in the expression
 * language. The MasterHandler class uses these node handlers to process
 * nodes in the expression language.
 */
declare class MasterHandler extends NodeHandler {
  nodeHandlers: NodeHandler[];
  accepts(node: ExpressionNode): Promise<ExpressionNode | boolean>;
  /**
   * This method is responsible for handling a node. It iterates over the
   * collection of node handlers and uses the first handler that accepts the
   * node to handle it. If no handler accepts the node, the method throws an
   * error.
   * @param node The node to be handled.
   * @returns The result of the node handling, or throws an error if no handler can handle the node.
   */
  handle(node: CallExpression): Promise<ParsedType>;
  /**
   * This static method creates an instance of the MasterHandler class and
   * initializes it with instances of all the node handlers.
   * @returns An instance of the MasterHandler class.
   */
  static createMasterHandler(): MasterHandler;
}
//#endregion
export { MasterHandler };
//# sourceMappingURL=factory.d.ts.map