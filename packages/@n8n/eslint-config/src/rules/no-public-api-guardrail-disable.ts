import { ESLintUtils } from '@typescript-eslint/utils';

const TARGET_RULES = ['no-repository-in-public-api-handler', 'require-public-api-controller'];
const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?\b/;

/**
 * Guards the public API handler-pattern ratchet: an inline disable is the one
 * way to smuggle a new violation past CI. New exceptions must go through the
 * allowlist in `packages/cli/eslint.config.mjs`, never an inline directive.
 */
export const NoPublicApiGuardrailDisableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow inline eslint-disable of the public API handler-pattern guardrails.',
		},
		messages: {
			noDisable: 'Do not disable `{{rule}}` inline. Migrate to `@PublicApiController`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value.trim();
					if (!DISABLE_DIRECTIVE.test(text)) continue;
					const rule = TARGET_RULES.find((name) => text.includes(name));
					if (rule) {
						context.report({ loc: comment.loc, messageId: 'noDisable', data: { rule } });
					}
				}
			},
		};
	},
});
