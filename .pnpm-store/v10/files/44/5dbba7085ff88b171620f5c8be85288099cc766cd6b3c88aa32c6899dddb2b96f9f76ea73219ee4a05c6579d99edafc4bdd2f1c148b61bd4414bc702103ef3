import { ASTParser, NodeHandler } from "./base.js";

//#region src/output_parsers/expression_type_handlers/numeric_literal_handler.ts
/**
* Handler for numeric literal nodes in an abstract syntax tree (AST).
* Extends the NodeHandler class.
*/
var NumericLiteralHandler = class extends NodeHandler {
	/**
	* Checks if a given node is a numeric literal. If it is, the method
	* returns the node; otherwise, it returns false.
	* @param node The node to check.
	* @returns A Promise that resolves to the node if it is a numeric literal, or false otherwise.
	*/
	async accepts(node) {
		if (ASTParser.isNumericLiteral(node)) return node;
		else return false;
	}
	/**
	* Processes a numeric literal node and returns a NumericLiteralType
	* object representing it.
	* @param node The numeric literal node to process.
	* @returns A Promise that resolves to a NumericLiteralType object representing the numeric literal node.
	*/
	async handle(node) {
		if (!this.parentHandler) throw new Error("ArrayLiteralExpressionHandler must have a parent handler");
		return {
			type: "numeric_literal",
			value: Number(node.value)
		};
	}
};

//#endregion
export { NumericLiteralHandler };
//# sourceMappingURL=numeric_literal_handler.js.map