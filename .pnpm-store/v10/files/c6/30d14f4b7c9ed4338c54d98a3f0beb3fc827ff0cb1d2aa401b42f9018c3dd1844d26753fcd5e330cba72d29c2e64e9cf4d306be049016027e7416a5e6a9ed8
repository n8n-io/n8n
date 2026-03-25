import { GRAMMAR } from "./grammar/parser_grammar.js";

//#region src/output_parsers/expression_type_handlers/base.ts
/**
* Abstract class for handling nodes in an expression language. Subclasses
* must implement the `accepts` and `handle` methods.
*/
var NodeHandler = class {
	constructor(parentHandler) {
		this.parentHandler = parentHandler;
	}
};
/**
* Utility class for parsing Abstract Syntax Trees (ASTs). Contains
* methods for identifying the type of a given node and a method for
* importing and generating a parser using the Peggy library.
*/
var ASTParser = class ASTParser {
	static astParseInstance;
	/**
	* Imports and generates a parser using the Peggy library.
	* @returns A Promise that resolves to the parser instance.
	*/
	static async importASTParser() {
		try {
			if (!ASTParser.astParseInstance) {
				const { default: peggy } = await import("peggy");
				const parser = peggy.generate(GRAMMAR);
				const { parse } = parser;
				ASTParser.astParseInstance = parse;
			}
			return ASTParser.astParseInstance;
		} catch {
			throw new Error(`Failed to import peggy. Please install peggy (i.e. "npm install peggy" or "pnpm install peggy").`);
		}
	}
	/**
	* Checks if the given node is a Program node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a Program node.
	*/
	static isProgram(node) {
		return node.type === "Program";
	}
	/**
	* Checks if the given node is an ExpressionStatement node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is an ExpressionStatement node.
	*/
	static isExpressionStatement(node) {
		return node.type === "ExpressionStatement";
	}
	/**
	* Checks if the given node is a CallExpression node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a CallExpression node.
	*/
	static isCallExpression(node) {
		return node.type === "CallExpression";
	}
	/**
	* Checks if the given node is a StringLiteral node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a StringLiteral node.
	*/
	static isStringLiteral(node) {
		return node.type === "StringLiteral" && typeof node.value === "string";
	}
	/**
	* Checks if the given node is a NumericLiteral node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a NumericLiteral node.
	*/
	static isNumericLiteral(node) {
		return node.type === "NumericLiteral" && typeof node.value === "number";
	}
	/**
	* Checks if the given node is a BooleanLiteral node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a BooleanLiteral node.
	*/
	static isBooleanLiteral(node) {
		return node.type === "BooleanLiteral" && typeof node.value === "boolean";
	}
	/**
	* Checks if the given node is an Identifier node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is an Identifier node.
	*/
	static isIdentifier(node) {
		return node.type === "Identifier";
	}
	/**
	* Checks if the given node is an ObjectExpression node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is an ObjectExpression node.
	*/
	static isObjectExpression(node) {
		return node.type === "ObjectExpression";
	}
	/**
	* Checks if the given node is an ArrayExpression node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is an ArrayExpression node.
	*/
	static isArrayExpression(node) {
		return node.type === "ArrayExpression";
	}
	/**
	* Checks if the given node is a PropertyAssignment node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a PropertyAssignment node.
	*/
	static isPropertyAssignment(node) {
		return node.type === "PropertyAssignment";
	}
	/**
	* Checks if the given node is a MemberExpression node.
	* @param node The node to be checked.
	* @returns A boolean indicating whether the node is a MemberExpression node.
	*/
	static isMemberExpression(node) {
		return node.type === "MemberExpression";
	}
};

//#endregion
export { ASTParser, NodeHandler };
//# sourceMappingURL=base.js.map