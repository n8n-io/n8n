/**
Check if parentheses should be added to a `node` when it's used as child of `ConditionalExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToConditionalExpressionChild(node) {
	return node.type === 'AwaitExpression'
		// Lower precedence, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
		|| node.type === 'AssignmentExpression'
		|| node.type === 'YieldExpression'
		|| node.type === 'SequenceExpression';
}
