import isBuiltinModule from 'is-builtin-module';
import {
	isStaticRequire,
	isMethodCall,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-node-protocol';
const messages = {
	[MESSAGE_ID]: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.',
};
const NODE_PROTOCOL = 'node:';

const create = context => ({
	Literal(node) {
		if (!(
			(
				(
					node.parent.type === 'ImportDeclaration'
					|| node.parent.type === 'ExportNamedDeclaration'
					|| node.parent.type === 'ImportExpression'
				)
				&& node.parent.source === node
			)
			|| (
				(
					isMethodCall(node.parent, {
						object: 'process',
						method: 'getBuiltinModule',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					|| isStaticRequire(node.parent)
				)
				&& node.parent.arguments[0] === node
			)
		)) {
			return;
		}

		const {value} = node;

		if (!(
			typeof value === 'string'
			&& !value.startsWith(NODE_PROTOCOL)
			&& isBuiltinModule(value)
			&& isBuiltinModule(`${NODE_PROTOCOL}${value}`)
		)) {
			return;
		}

		const insertPosition = context.sourceCode.getRange(node)[0] + 1; // After quote
		return {
			node,
			messageId: MESSAGE_ID,
			data: {moduleName: value},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => fixer.insertTextAfterRange([insertPosition, insertPosition], NODE_PROTOCOL),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `node:` protocol when importing Node.js builtin modules.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
