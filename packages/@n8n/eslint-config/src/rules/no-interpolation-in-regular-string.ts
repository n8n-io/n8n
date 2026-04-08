import { ESLintUtils } from '@typescript-eslint/utils';

export const NoInterpolationInRegularStringRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'String interpolation `${...}` requires backticks, not single or double quotes.',
		},
		messages: {
			useBackticks: 'Use backticks to interpolate',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Literal(node) {
				if (typeof node.value !== 'string') return;

				if (/\$\{/.test(node.value)) {
					context.report({
						messageId: 'useBackticks',
						node,
						fix: (fixer) => fixer.replaceText(node, `\`${node.value}\``),
					});
				}
			},
		};
	},
});
