import { ESLintUtils } from '@typescript-eslint/utils';

const TARGET_RULE = 'misplaced-n8n-typeorm-import';
const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?\b/;

/**
 * Guards the `misplaced-n8n-typeorm-import` ratchet: an inline disable is the one
 * way to smuggle a new `@n8n/typeorm` leak past CI. New exceptions must go through
 * the allowlist in `packages/cli/eslint.config.mjs`, never an inline directive.
 */
export const NoMisplacedTypeormImportDisableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow inline eslint-disable of `misplaced-n8n-typeorm-import`.',
		},
		messages: {
			noDisable:
				'Do not disable `misplaced-n8n-typeorm-import` inline. Keep TypeORM in the persistence layer (add a use-case repository method), or add the file to the allowlist in packages/cli/eslint.config.mjs.',
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
