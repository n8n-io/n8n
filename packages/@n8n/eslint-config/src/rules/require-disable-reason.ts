import { ESLintUtils } from '@typescript-eslint/utils';

type MessageIds = 'missingReason' | 'nextLineOnly' | 'bareDirective' | 'noSelfDisable';
type Options = [{ rules?: string[] }?];

const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?(?=\s|$)/;

/** ESLint separates the description from the rule list with two or more dashes. */
const DESCRIPTION_SEPARATOR = /\s-{2,}(?:\s|$)/;

/** This rule, without the plugin prefix. A directive must never disable it. */
const SELF = 'require-disable-reason';

/**
 * An exception to a listed rule must be visible and explained: one line, and a
 * reason that the reviewer can confirm. The rule reminds engineers to explain
 * each exception. It does not stop a deliberate bypass.
 *
 * A block or `-line` directive that disables every rule, or that names this
 * rule, also disables this rule at its own location, so ESLint drops that
 * report. Code-health `encryption-boundary` rejects a directive without rule
 * names. A block or `-line` directive that names this rule is not reported.
 */
export const RequireDisableReasonRule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require the next-line form and a reason on a directive that disables one of the listed rules.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					rules: {
						type: 'array',
						items: { type: 'string' },
						description: 'Rule IDs that need a reason when a directive disables them.',
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			missingReason:
				'Add the reason for this exception after "--": // eslint-disable-next-line {{rule}} -- <reason>',
			nextLineOnly:
				'Disable {{rule}} for one line only: // eslint-disable-next-line {{rule}} -- <reason>',
			bareDirective:
				'Name the rules that this directive disables. A directive without rule names also disables {{rule}}.',
			noSelfDisable:
				'Do not disable {{self}}. It makes sure that each exception to {{rule}} has a reason.',
		},
	},
	defaultOptions: [{}],
	create(context, [options]) {
		const guarded = new Set(options?.rules ?? []);
		if (guarded.size === 0) return {};

		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value.trim();
					const directive = DISABLE_DIRECTIVE.exec(text);
					if (!directive) continue;

					const body = text.slice(directive[0].length);
					const separator = body.search(DESCRIPTION_SEPARATOR);
					const ruleList = separator === -1 ? body : body.slice(0, separator);
					const reason =
						separator === -1 ? '' : body.slice(separator).trim().replace(/^-+/, '').trim();

					// Only the rule list counts. The reason may mention a rule without disabling it.
					const ruleIds = ruleList
						.split(',')
						.map((id) => id.trim())
						.filter((id) => id !== '');

					if (ruleIds.length === 0) {
						const [rule] = guarded;
						context.report({ loc: comment.loc, messageId: 'bareDirective', data: { rule } });
						continue;
					}

					// A reason does not make this acceptable: disabling this rule on the
					// line of another directive removes the reason check from it.
					const self = ruleIds.find((id) => id === SELF || id.endsWith(`/${SELF}`));
					if (self !== undefined) {
						const [rule] = guarded;
						context.report({ loc: comment.loc, messageId: 'noSelfDisable', data: { self, rule } });
						continue;
					}

					const rule = ruleIds.find((id) => guarded.has(id));
					if (rule === undefined) continue;

					if (directive[1] !== '-next-line') {
						context.report({ loc: comment.loc, messageId: 'nextLineOnly', data: { rule } });
					}
					if (reason === '') {
						context.report({ loc: comment.loc, messageId: 'missingReason', data: { rule } });
					}
				}
			},
		};
	},
});
