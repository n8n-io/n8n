/**
Check if the given node is a true logical expression or not.

The three binary expressions logical-or (`||`), logical-and (`&&`), and coalesce (`??`) are known as `ShortCircuitExpression`, but ESTree represents these by the `LogicalExpression` node type. This function rejects coalesce expressions of `LogicalExpression` node type.

@param {Node} node - The node to check.
@returns {boolean} `true` if the node is `&&` or `||`.
@see https://tc39.es/ecma262/#prod-ShortCircuitExpression
*/
const isLogicalExpression = node =>
	node?.type === 'LogicalExpression'
	&& (node.operator === '&&' || node.operator === '||');

export default isLogicalExpression;
