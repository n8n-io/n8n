import { ESLintUtils } from '@typescript-eslint/utils';

const TARGET_RULE = 'no-undeclared-cross-module-import';
const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?\b/;

export const NoCrossModuleImportDisableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow inline eslint-disable of `no-undeclared-cross-module-import`.',
		},
		messages: {
			noDisable:
				'Do not disable `no-undeclared-cross-module-import` inline. Invert the dependency via a registry (see scripts/backend-module/backend-module-guide.md), or declare the edge in `allowedDependencies` in packages/cli/eslint.config.mjs.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value.trim();
					if (DISABLE_DIRECTIVE.test(text) && text.includes(TARGET_RULE)) {
						context.report({ loc: comment.loc, messageId: 'noDisable' });
					}
				}
			},
		};
	},
});
