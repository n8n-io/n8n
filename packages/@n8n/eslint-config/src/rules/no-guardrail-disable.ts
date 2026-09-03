import { ESLintUtils } from '@typescript-eslint/utils';

const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?\b/;

type GuardedRule = { rule: string; message: string };

/**
 * Guards ratchet rules: an inline disable is the one way to smuggle a new violation past CI.
 * Each guarded rule names its own escape hatch (an allowlist, a sanctioned method) in `message`.
 */
export const NoGuardrailDisableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow inline eslint-disable of the configured guardrail rules.',
		},
		messages: {
			noDisable: 'Do not disable `{{rule}}` inline. {{message}}',
		},
		schema: [
			{
				type: 'object',
				properties: {
					guarded: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								rule: { type: 'string', description: 'Rule name without the plugin prefix' },
								message: { type: 'string', description: 'What to do instead of disabling' },
							},
							required: ['rule', 'message'],
							additionalProperties: false,
						},
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ guarded: [] as GuardedRule[] }],
	create(context, [{ guarded }]) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value.trim();
					if (!DISABLE_DIRECTIVE.test(text)) continue;
					const hit = guarded.find(({ rule }) => text.includes(rule));
					if (hit) {
						context.report({
							loc: comment.loc,
							messageId: 'noDisable',
							data: { rule: hit.rule, message: hit.message },
						});
					}
				}
			},
		};
	},
});
