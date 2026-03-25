import { NodeHandler } from "./base.js";
import { ArrayLiteralExpressionHandler } from "./array_literal_expression_handler.js";
import { BooleanLiteralHandler } from "./boolean_literal_handler.js";
import { CallExpressionHandler } from "./call_expression_handler.js";
import { NumericLiteralHandler } from "./numeric_literal_handler.js";
import { PropertyAssignmentHandler } from "./property_assignment_handler.js";
import { ObjectLiteralExpressionHandler } from "./object_literal_expression_handler.js";
import { StringLiteralHandler } from "./string_literal_handler.js";
import { IdentifierHandler } from "./identifier_handler.js";
import { MemberExpressionHandler } from "./member_expression_handler.js";

//#region src/output_parsers/expression_type_handlers/factory.ts
const handlers = [
	ArrayLiteralExpressionHandler,
	BooleanLiteralHandler,
	CallExpressionHandler,
	NumericLiteralHandler,
	ObjectLiteralExpressionHandler,
	MemberExpressionHandler,
	PropertyAssignmentHandler,
	StringLiteralHandler,
	IdentifierHandler
];
/**
* The MasterHandler class is responsible for managing a collection of
* node handlers in the LangChain Expression Language. Each node handler
* is capable of handling a specific type of node in the expression
* language. The MasterHandler class uses these node handlers to process
* nodes in the expression language.
*/
var MasterHandler = class MasterHandler extends NodeHandler {
	nodeHandlers = [];
	async accepts(node) {
		throw new Error(`Master handler does not accept any nodes: ${node}`);
	}
	/**
	* This method is responsible for handling a node. It iterates over the
	* collection of node handlers and uses the first handler that accepts the
	* node to handle it. If no handler accepts the node, the method throws an
	* error.
	* @param node The node to be handled.
	* @returns The result of the node handling, or throws an error if no handler can handle the node.
	*/
	async handle(node) {
		for (const handler of this.nodeHandlers) {
			const accepts = await handler.accepts(node);
			if (accepts) return handler.handle(node);
		}
		throw new Error(`No handler found for node: ${node}`);
	}
	/**
	* This static method creates an instance of the MasterHandler class and
	* initializes it with instances of all the node handlers.
	* @returns An instance of the MasterHandler class.
	*/
	static createMasterHandler() {
		const masterHandler = new MasterHandler();
		handlers.forEach((Handler) => {
			const handlerInstance = new Handler(masterHandler);
			masterHandler.nodeHandlers.push(handlerInstance);
		});
		return masterHandler;
	}
};

//#endregion
export { MasterHandler };
//# sourceMappingURL=factory.js.map