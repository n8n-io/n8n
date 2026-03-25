const require_base = require('./base.cjs');
const require_property_assignment_handler = require('./property_assignment_handler.cjs');

//#region src/output_parsers/expression_type_handlers/object_literal_expression_handler.ts
/**
* Handles object literal expressions in the LangChain Expression
* Language. Extends the NodeHandler class.
*/
var ObjectLiteralExpressionHandler = class extends require_base.NodeHandler {
	/**
	* Checks if a given node is an object expression. Returns the node if it
	* is, otherwise returns false.
	* @param node The node to check.
	* @returns The node if it is an object expression, otherwise false.
	*/
	async accepts(node) {
		if (require_base.ASTParser.isObjectExpression(node)) return node;
		else return false;
	}
	/**
	* Processes the object expression node and returns an object of type
	* ObjectLiteralType. Throws an error if the parent handler is not set.
	* @param node The object expression node to process.
	* @returns An object of type ObjectLiteralType.
	*/
	async handle(node) {
		if (!this.parentHandler) throw new Error("ArrayLiteralExpressionHandler must have a parent handler");
		const values = [];
		const { properties } = node;
		for (const property of properties) if (require_base.ASTParser.isPropertyAssignment(property)) values.push(await new require_property_assignment_handler.PropertyAssignmentHandler(this.parentHandler).handle(property));
		return {
			type: "object_literal",
			values
		};
	}
};

//#endregion
exports.ObjectLiteralExpressionHandler = ObjectLiteralExpressionHandler;
//# sourceMappingURL=object_literal_expression_handler.cjs.map