import { ESLintUtils } from '@typescript-eslint/utils';

const restrictedGlobals = [
	'clearInterval',
	'clearTimeout',
	'global',
	'globalThis',
	'process',
	'setInterval',
	'setTimeout',
	'setImmediate',
	'clearImmediate',
	'__dirname',
	'__filename',
	'Buffer',
	'require',
];

export const NoRestrictedGlobalsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of restricted global variables in community nodes.',
		},
		messages: {
			restrictedGlobal: "Use of restricted global '{{ name }}' is not allowed",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Identifier(node) {
				if (!restrictedGlobals.includes(node.name)) {
					return;
				}

				const { parent } = node;
				if (!parent) {
					return;
				}

				// Allow usage as property keys in object literals
				if (parent.type === 'Property' && parent.key === node && !parent.computed) {
					return;
				}

				// Allow usage in function declarations
				if (parent.type === 'FunctionDeclaration' && parent.id === node) {
					return;
				}

				// Allow usage as property in member expressions (e.g., window.setTimeout)
				if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
					return;
				}

				// Allow usage as object in member expressions if it's not the restricted global itself
				if (parent.type === 'MemberExpression' && parent.object === node) {
					// This is the actual global usage we want to restrict
					context.report({
						node,
						messageId: 'restrictedGlobal',
						data: {
							name: node.name,
						},
					});
					return;
				}

				// Direct usage of global (not as member expression object or property)
				context.report({
					node,
					messageId: 'restrictedGlobal',
					data: {
						name: node.name,
					},
				});
			},
		};
	},
});
