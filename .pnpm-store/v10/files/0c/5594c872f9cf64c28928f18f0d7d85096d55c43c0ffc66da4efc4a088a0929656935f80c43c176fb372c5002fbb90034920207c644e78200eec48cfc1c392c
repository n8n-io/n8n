import { ASTParser, NodeHandler } from "./base.js";

//#region src/output_parsers/expression_type_handlers/string_literal_handler.ts
/**
* Handler for string literal nodes in the LangChain Expression Language.
* Extends the NodeHandler base class.
*/
var StringLiteralHandler = class extends NodeHandler {
	/**
	* Checks if a given node is a string literal. If it is, the method
	* returns the node; otherwise, it returns false.
	* @param node The ExpressionNode to check.
	* @returns A Promise that resolves to the node if it is a StringLiteral, or false otherwise.
	*/
	async accepts(node) {
		if (ASTParser.isStringLiteral(node)) return node;
		else return false;
	}
	/**
	* Processes a string literal node to extract its value. Throws an error
	* if the handler does not have a parent handler.
	* @param node The StringLiteral node to process.
	* @returns A Promise that resolves to a StringLiteralType object representing the processed form of the node.
	*/
	async handle(node) {
		if (!this.parentHandler) throw new Error("ArrayLiteralExpressionHandler must have a parent handler");
		const text = `${node.value}`.replace(/^["'](.+(?=["']$))["']$/, "$1");
		return {
			type: "string_literal",
			value: text
		};
	}
};

//#endregion
export { StringLiteralHandler };
//# sourceMappingURL=string_literal_handler.js.map