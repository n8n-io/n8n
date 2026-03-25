const require_base = require('./base.cjs');
const require_array_literal_expression_handler = require('./array_literal_expression_handler.cjs');
const require_boolean_literal_handler = require('./boolean_literal_handler.cjs');
const require_call_expression_handler = require('./call_expression_handler.cjs');
const require_numeric_literal_handler = require('./numeric_literal_handler.cjs');
const require_property_assignment_handler = require('./property_assignment_handler.cjs');
const require_object_literal_expression_handler = require('./object_literal_expression_handler.cjs');
const require_string_literal_handler = require('./string_literal_handler.cjs');
const require_identifier_handler = require('./identifier_handler.cjs');
const require_member_expression_handler = require('./member_expression_handler.cjs');

//#region src/output_parsers/expression_type_handlers/factory.ts
const handlers = [
	require_array_literal_expression_handler.ArrayLiteralExpressionHandler,
	require_boolean_literal_handler.BooleanLiteralHandler,
	require_call_expression_handler.CallExpressionHandler,
	require_numeric_literal_handler.NumericLiteralHandler,
	require_object_literal_expression_handler.ObjectLiteralExpressionHandler,
	require_member_expression_handler.MemberExpressionHandler,
	require_property_assignment_handler.PropertyAssignmentHandler,
	require_string_literal_handler.StringLiteralHandler,
	require_identifier_handler.IdentifierHandler
];
/**
* The MasterHandler class is responsible for managing a collection of
* node handlers in the LangChain Expression Language. Each node handler
* is capable of handling a specific type of node in the expression
* language. The MasterHandler class uses these node handlers to process
* nodes in the expression language.
*/
var MasterHandler = class MasterHandler extends require_base.NodeHandler {
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
exports.MasterHandler = MasterHandler;
//# sourceMappingURL=factory.cjs.map