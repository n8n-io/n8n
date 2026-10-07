import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Port of `vue/require-macro-variable-name` with the options the frontend layer
 * used. It runs on the script blocks of a `.vue` file, so oxlint can enforce it.
 */
const VARIABLE_NAME_BY_MACRO: Record<string, string> = {
	defineProps: 'props',
	withDefaults: 'props',
	defineEmits: 'emit',
	defineSlots: 'slots',
	useSlots: 'slots',
	useAttrs: 'attrs',
};

export const RequireMacroVariableNameRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require a fixed variable name for the result of a Vue macro.',
		},
		messages: {
			requireName: 'The variable name of "{{macroName}}" must be "{{variableName}}".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.vue')) return {};

		return {
			VariableDeclarator(node) {
				if (
					node.id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					node.init?.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
					node.init.callee.type !== TSESTree.AST_NODE_TYPES.Identifier
				) {
					return;
				}

				const callee = node.init.callee.name;
				const variableName = VARIABLE_NAME_BY_MACRO[callee];
				if (variableName === undefined || node.id.name === variableName) return;

				context.report({
					node: node.id,
					messageId: 'requireName',
					data: {
						macroName: callee === 'withDefaults' ? 'defineProps' : callee,
						variableName,
					},
				});
			},
		};
	},
});
