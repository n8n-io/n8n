const isMethodNamed = (node, name) =>
	node.type === 'CallExpression'
	&& node.callee.type === 'MemberExpression'
	&& node.callee.property.type === 'Identifier'
	&& node.callee.property.name === name;

export default isMethodNamed;
