import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

export const NoDynamicImportTemplateRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow non-relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario.',
		},
		schema: [],
		messages: {
			noDynamicImportTemplate:
				'Use relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario.',
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			'AwaitExpression > ImportExpression TemplateLiteral'(node: TSESTree.TemplateLiteral) {
				const templateValue = node.quasis[0].value.cooked;

				if (!templateValue?.startsWith('@/')) return;

				context.report({
					node,
					messageId: 'noDynamicImportTemplate',
				});
			},
		};
	},
});
