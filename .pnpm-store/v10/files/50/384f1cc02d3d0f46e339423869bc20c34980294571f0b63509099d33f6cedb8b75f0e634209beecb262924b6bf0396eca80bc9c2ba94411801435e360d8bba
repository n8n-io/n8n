const isLeftHandSide = node =>
	(
		(node.parent.type === 'AssignmentExpression' || node.parent.type === 'AssignmentPattern')
		&& node.parent.left === node
	)
	|| (node.parent.type === 'UpdateExpression' && node.parent.argument === node)
	|| (node.parent.type === 'ArrayPattern' && node.parent.elements.includes(node))
	|| (
		node.parent.type === 'Property'
		&& node.parent.value === node
		&& node.parent.parent.type === 'ObjectPattern'
		&& node.parent.parent.properties.includes(node.parent)
	)
	|| (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
		&& node.parent.argument === node
	);

export default isLeftHandSide;
