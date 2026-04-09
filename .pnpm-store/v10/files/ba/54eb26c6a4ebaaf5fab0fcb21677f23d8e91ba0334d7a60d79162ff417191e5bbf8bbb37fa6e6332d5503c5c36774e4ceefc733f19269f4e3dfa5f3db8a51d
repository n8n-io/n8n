import { U as isParenthesised, f as createRule, g as import_ast_utils, k as getPrecedence } from "../utils.js";
const ARITHMETIC_OPERATORS = [
	"+",
	"-",
	"*",
	"/",
	"%",
	"**"
];
const BITWISE_OPERATORS = [
	"&",
	"|",
	"^",
	"~",
	"<<",
	">>",
	">>>"
];
const COMPARISON_OPERATORS = [
	"==",
	"!=",
	"===",
	"!==",
	">",
	">=",
	"<",
	"<="
];
const LOGICAL_OPERATORS = ["&&", "||"];
const RELATIONAL_OPERATORS = ["in", "instanceof"];
const ALL_OPERATORS = [].concat(ARITHMETIC_OPERATORS, BITWISE_OPERATORS, COMPARISON_OPERATORS, LOGICAL_OPERATORS, RELATIONAL_OPERATORS, ["?:"], ["??"]);
const DEFAULT_GROUPS = [
	ARITHMETIC_OPERATORS,
	BITWISE_OPERATORS,
	COMPARISON_OPERATORS,
	LOGICAL_OPERATORS,
	RELATIONAL_OPERATORS
];
const TARGET_NODE_TYPE = /^(?:Binary|Logical|Conditional)Expression$/u;
function includesBothInAGroup(groups, left, right) {
	return groups.some((group) => group.includes(left) && group.includes(right));
}
function getChildNode(node) {
	return node.type === "ConditionalExpression" ? node.test : node.left;
}
var no_mixed_operators_default = createRule({
	name: "no-mixed-operators",
	meta: {
		type: "layout",
		docs: { description: "Disallow mixed binary operators" },
		schema: [{
			type: "object",
			properties: {
				groups: {
					type: "array",
					items: {
						type: "array",
						items: {
							type: "string",
							enum: ALL_OPERATORS
						},
						minItems: 2,
						uniqueItems: true
					},
					uniqueItems: true
				},
				allowSamePrecedence: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			groups: DEFAULT_GROUPS,
			allowSamePrecedence: true
		}],
		messages: { unexpectedMixedOperator: "Unexpected mix of '{{leftOperator}}' and '{{rightOperator}}'. Use parentheses to clarify the intended order of operations." }
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const { groups, allowSamePrecedence } = options;
		function shouldIgnore(node) {
			const a = node;
			const b = node.parent;
			return !includesBothInAGroup(groups, a.operator, b.type === "ConditionalExpression" ? "?:" : b.operator) || allowSamePrecedence && getPrecedence(a) === getPrecedence(b);
		}
		function isMixedWithParent(node) {
			return node.operator !== node.parent.operator && !isParenthesised(sourceCode, node);
		}
		function getOperatorToken(node) {
			return sourceCode.getTokenAfter(getChildNode(node), import_ast_utils.isNotClosingParenToken);
		}
		function reportBothOperators(node) {
			const parent = node.parent;
			const left = getChildNode(parent) === node ? node : parent;
			const right = getChildNode(parent) !== node ? node : parent;
			const data = {
				leftOperator: left.operator || "?:",
				rightOperator: right.operator || "?:"
			};
			context.report({
				node: left,
				loc: getOperatorToken(left).loc,
				messageId: "unexpectedMixedOperator",
				data
			});
			context.report({
				node: right,
				loc: getOperatorToken(right).loc,
				messageId: "unexpectedMixedOperator",
				data
			});
		}
		function check(node) {
			if (TARGET_NODE_TYPE.test(node.parent.type) && isMixedWithParent(node) && !shouldIgnore(node)) reportBothOperators(node);
		}
		return {
			BinaryExpression: check,
			LogicalExpression: check
		};
	}
});
export { no_mixed_operators_default as t };
