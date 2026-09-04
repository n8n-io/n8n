import { ESLintUtils } from '@typescript-eslint/utils';

/** Captures the directive kind, then an optional rule list and an optional `-- reason`. */
const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?(?![\w-])([\s\S]*)$/;
const PLUGIN_PREFIX = 'n8n-local-rules/';
const SELF = 'no-guardrail-disable';

type GuardedRule = { rule: string; message: string };

/** Rule IDs named by a directive, with the plugin prefix dropped. Empty means "all rules". */
const disabledRuleIds = (directiveTail: string): string[] => {
	const [ruleList = ''] = directiveTail.split('--', 1);
	return ruleList
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id !== '')
		.map((id) => (id.startsWith(PLUGIN_PREFIX) ? id.slice(PLUGIN_PREFIX.length) : id));
};

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
			noBlanketDisable:
				'This directive also disables the guardrails `{{rules}}`. Name the rules you mean, and never this rule.',
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
		if (guarded.length === 0) return {};
		const { sourceCode } = context;
		return {
			Program() {
				for (const comment of sourceCode.getAllComments()) {
					const match = DISABLE_DIRECTIVE.exec(comment.value.trim());
					if (!match) continue;
					const [, kind, tail] = match;
					const ids = disabledRuleIds(tail);
					if (ids.length === 0 || ids.includes(SELF)) {
						// Such a directive silences this rule too, so the report must land outside its
						// reach: before the comment, or on the previous line for `-line`.
						const reach =
							kind === '-line'
								? sourceCode.getIndexFromLoc({ line: comment.loc.start.line, column: 0 })
								: comment.range[0];
						const loc =
							reach > 0
								? {
										start: sourceCode.getLocFromIndex(reach - 1),
										end: sourceCode.getLocFromIndex(reach),
									}
								: comment.loc;
						context.report({
							loc,
							messageId: 'noBlanketDisable',
							data: { rules: guarded.map(({ rule }) => rule).join('`, `') },
						});
						continue;
					}
					for (const hit of guarded.filter(({ rule }) => ids.includes(rule))) {
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
