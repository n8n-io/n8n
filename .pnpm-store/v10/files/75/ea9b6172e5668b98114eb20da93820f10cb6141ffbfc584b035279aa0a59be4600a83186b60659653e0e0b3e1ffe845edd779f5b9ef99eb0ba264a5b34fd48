import {isMemberExpression} from './ast/index.js';

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Prefer `.textContent` over `.innerText`.',
	[SUGGESTION]: 'Switch to `.textContent`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	MemberExpression(memberExpression) {
		if (
			!isMemberExpression(memberExpression, {
				property: 'innerText',
			})
		) {
			return;
		}

		const node = memberExpression.property;

		return {
			node,
			messageId: ERROR,
			suggest: [
				{
					messageId: SUGGESTION,
					fix: fixer => fixer.replaceText(node, 'textContent'),
				},
			],
		};
	},
	Identifier(node) {
		if (!(
			node.name === 'innerText'
			&& node.parent.type === 'Property'
			&& node.parent.key === node
			&& !node.parent.computed
			&& node.parent.kind === 'init'
			&& node.parent.parent.type === 'ObjectPattern'
			&& node.parent.parent.properties.includes(node.parent)
		)) {
			return;
		}

		return {
			node,
			messageId: ERROR,
			suggest: [
				{
					messageId: SUGGESTION,
					fix: fixer => fixer.replaceText(
						node,
						node.parent.shorthand ? 'textContent: innerText' : 'textContent',
					),
				},
			],
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
