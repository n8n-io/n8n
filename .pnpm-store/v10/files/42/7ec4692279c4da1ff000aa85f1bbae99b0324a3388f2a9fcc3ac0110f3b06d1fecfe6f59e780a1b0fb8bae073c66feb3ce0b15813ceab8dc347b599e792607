import { ExpressionParser } from "../../output_parsers/expression.js";
import { Comparators, Comparison, Operation, Operators } from "@langchain/core/structured_query";

//#region src/chains/query_constructor/parser.ts
/**
* A class for transforming and parsing query expressions.
*/
var QueryTransformer = class {
	constructor(allowedComparators = [], allowedOperators = []) {
		this.allowedComparators = allowedComparators;
		this.allowedOperators = allowedOperators;
	}
	/**
	* Matches a function name to a comparator or operator. Throws an error if
	* the function name is unknown or not allowed.
	* @param funcName The function name to match.
	* @returns The matched function name.
	*/
	matchFunctionName(funcName) {
		if (funcName in Comparators) if (this.allowedComparators.length > 0) if (this.allowedComparators.includes(funcName)) return funcName;
		else throw new Error("Received comparator not allowed");
		else return funcName;
		if (funcName in Operators) if (this.allowedOperators.length > 0) if (this.allowedOperators.includes(funcName)) return funcName;
		else throw new Error("Received operator not allowed");
		else return funcName;
		throw new Error("Unknown function name");
	}
	/**
	* Transforms a parsed expression into an operation or comparison. Throws
	* an error if the parsed expression is not supported.
	* @param parsed The parsed expression to transform.
	* @returns The transformed operation or comparison.
	*/
	transform(parsed) {
		const traverse = (node) => {
			switch (node.type) {
				case "call_expression": {
					if (typeof node.funcCall !== "string") throw new Error("Property access expression and element access expression not supported");
					const funcName = this.matchFunctionName(node.funcCall);
					if (funcName in Operators) return new Operation(funcName, node.args?.map((arg) => traverse(arg)));
					if (funcName in Comparators) {
						if (node.args && node.args.length === 2) {
							const [attribute, value] = node.args;
							return new Comparison(funcName, traverse(attribute), traverse(value));
						}
						throw new Error("Comparator must have exactly 2 arguments");
					}
					throw new Error("Function name neither operator nor comparator");
				}
				case "string_literal": return node.value;
				case "numeric_literal": return node.value;
				case "array_literal": return node.values.map((value) => traverse(value));
				case "object_literal": return node.values.reduce((acc, value) => {
					acc[value.identifier] = traverse(value.value);
					return acc;
				}, {});
				case "boolean_literal": return node.value;
				default: throw new Error("Unknown node type");
			}
		};
		return traverse(parsed);
	}
	/**
	* Parses an expression and returns the transformed operation or
	* comparison. Throws an error if the expression cannot be parsed.
	* @param expression The expression to parse.
	* @returns A Promise that resolves to the transformed operation or comparison.
	*/
	async parse(expression) {
		const expressionParser = new ExpressionParser();
		const parsed = await expressionParser.parse(expression);
		if (!parsed) throw new Error("Could not parse expression");
		return this.transform(parsed);
	}
};

//#endregion
export { QueryTransformer };
//# sourceMappingURL=parser.js.map