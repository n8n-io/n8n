import {isFunction} from './ast/index.js';

const MESSAGE_ID_IDENTIFIER = 'identifier';
const MESSAGE_ID_NON_IDENTIFIER = 'non-identifier';
const messages = {
	[MESSAGE_ID_IDENTIFIER]: 'Do not use an object literal as default for parameter `{{parameter}}`.',
	[MESSAGE_ID_NON_IDENTIFIER]: 'Do not use an object literal as default.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	AssignmentPattern(node) {
		if (!(
			node.right.type === 'ObjectExpression'
			&& node.right.properties.length > 0
			&& isFunction(node.parent)
			&& node.parent.params.includes(node)
		)) {
			return;
		}

		const {left, right} = node;

		if (left.type === 'Identifier') {
			return {
				node: left,
				messageId: MESSAGE_ID_IDENTIFIER,
				data: {parameter: left.name},
			};
		}

		return {
			node: right,
			messageId: MESSAGE_ID_NON_IDENTIFIER,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow the use of objects as default parameters.',
			recommended: true,
		},
		messages,
	},
};

export default config;
