import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const MODULE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.json', '.node'];

export const NoDynamicImportTemplateRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow non-relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario. Also require an explicit file extension, because `module: NodeNext` emits a native `import()` whose specifier Node resolves without extension inference.',
		},
		schema: [],
		messages: {
			noDynamicImportTemplate:
				'Use relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario.',
			missingExtension:
				'End the template string argument to `await import()` with an explicit file extension (e.g. `.js`). Under `module: NodeNext` this compiles to a native `import()`, and Node throws ERR_MODULE_NOT_FOUND for an extensionless relative specifier.',
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

			'AwaitExpression > ImportExpression > TemplateLiteral'(node: TSESTree.TemplateLiteral) {
				const head = node.quasis[0].value.cooked;

				if (!head?.startsWith('./') && !head?.startsWith('../')) {
					return;
				}

				const tail = node.quasis[node.quasis.length - 1].value.cooked ?? '';

				if (!MODULE_EXTENSIONS.some((extension) => tail.endsWith(extension))) {
					context.report({
						node,
						messageId: 'missingExtension',
					});
				}
			},
		};
	},
});
