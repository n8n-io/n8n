const MESSAGE_ID = 'no-this-assignment';
const messages = {
	[MESSAGE_ID]: 'Do not assign `this` to `{{name}}`.',
};

function getProblem(variableNode, valueNode) {
	if (
		variableNode.type !== 'Identifier'
		|| valueNode?.type !== 'ThisExpression'
	) {
		return;
	}

	return {
		node: valueNode.parent,
		data: {name: variableNode.name},
		messageId: MESSAGE_ID,
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => getProblem(node.id, node.init));
	context.on('AssignmentExpression', node => getProblem(node.left, node.right));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow assigning `this` to a variable.',
			recommended: true,
		},
		messages,
	},
};

export default config;
