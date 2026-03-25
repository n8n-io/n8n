export default function isObjectMethod(node, object, method) {
	const {callee} = node;
	return (
		callee.type === 'MemberExpression'
		&& callee.object.type === 'Identifier'
		&& callee.object.name === object
		&& callee.property.type === 'Identifier'
		&& callee.property.name === method
	);
}
