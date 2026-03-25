/**
Check if parentheses should be added to a `node` when it's used as child of `LogicalExpression`.
@param {Node} node - The AST node to check.
@param {{operator: string, property: string}} options - Options
@returns {boolean}
*/
export default function shouldAddParenthesesToLogicalExpressionChild(node, {operator, property}) {
	// We are not using this, but we can improve this function with it
	/* c8 ignore next 3 */
	if (!property) {
		throw new Error('`property` is required.');
	}

	if (
		node.type === 'LogicalExpression'
		&& node.operator === operator
	) {
		return false;
	}

	// Not really needed, but more readable
	if (
		node.type === 'AwaitExpression'
		|| node.type === 'BinaryExpression'
	) {
		return true;
	}

	// Lower precedence than `LogicalExpression`
	// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
	if (
		node.type === 'LogicalExpression'
		|| node.type === 'ConditionalExpression'
		|| node.type === 'AssignmentExpression'
		|| node.type === 'ArrowFunctionExpression'
		|| node.type === 'YieldExpression'
		|| node.type === 'SequenceExpression'
	) {
		return true;
	}

	return false;
}
