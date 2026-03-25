/**
Check if parentheses should be added to a `node` when it's used as `callee` of `CallExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToCallExpressionCallee(node) {
	return node.type === 'SequenceExpression'
		|| node.type === 'YieldExpression'
		|| node.type === 'ArrowFunctionExpression'
		|| node.type === 'ConditionalExpression'
		|| node.type === 'AssignmentExpression'
		|| node.type === 'LogicalExpression'
		|| node.type === 'BinaryExpression'
		|| node.type === 'UnaryExpression'
		|| node.type === 'UpdateExpression'
		|| node.type === 'NewExpression';
}
