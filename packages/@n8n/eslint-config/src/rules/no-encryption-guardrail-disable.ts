import { ESLintUtils } from '@typescript-eslint/utils';

const TARGET_RULES = [
	'no-legacy-cipher-methods',
	'no-misplaced-cipher-primitives',
	'no-deployment-key-delete',
	// Self-protection: a `-next-line` directive naming this rule cannot
	// suppress the report this rule emits at the directive's own line.
	'no-encryption-guardrail-disable',
];
const DISABLE_DIRECTIVE = /^eslint-disable(-next-line|-line)?\b/;

/** Migrations are an allowed area for the guarded rules, and the generated
 * migration index files legitimately start with a blanket disable. */
const MIGRATIONS_PATH_PATTERN = /[\\/]migrations[\\/]/;

/** The guarded rules do not run in test files, so a disable there hides nothing. */
const TEST_FILE_PATTERN = /(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])/;

/**
 * Guards the encryption boundary: an inline disable is the one way to smuggle
 * a new violation past CI. The boundary can only be widened in
 * `packages/@n8n/eslint-config/src/configs/encryption-boundary.ts`, which is
 * under security ownership.
 *
 * Known residuals this rule cannot close from inside ESLint (a block
 * directive's disabled range starts at the directive itself, so it swallows
 * any report this rule emits there): a bare block `eslint-disable`, and a
 * block directive naming this rule. A package-level `'off'` override in
 * eslint.config.mjs is equally invisible to lint. All three are only guarded
 * by review — the config and rule files require IAM approval via OWNERS.
 */
export const NoEncryptionGuardrailDisableRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow inline eslint-disable of the encryption-boundary guardrails.',
		},
		messages: {
			noDisable:
				'Do not disable `{{rule}}` inline. Widen the boundary in `encryption-boundary.ts` instead — that file requires security review.',
			noBareDisable:
				'Blanket eslint-disable directives silence the encryption guardrails. Name the specific rules you need to disable.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (
			MIGRATIONS_PATH_PATTERN.test(context.filename) ||
			TEST_FILE_PATTERN.test(context.filename)
		) {
			return {};
		}

		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value.trim();
					const directive = DISABLE_DIRECTIVE.exec(text);
					if (!directive) continue;

					// Bare line-form disables silence every rule on the target line.
					// (The block form cannot be reported: its disabled range starts at
					// the directive itself and would swallow this very report.)
					const ruleList = text.slice(directive[0].length).trim();
					if (
						(ruleList === '' || ruleList.startsWith('--')) &&
						directive[1] !== undefined // -next-line / -line only
					) {
						context.report({ loc: comment.loc, messageId: 'noBareDisable' });
						continue;
					}

					const rule = TARGET_RULES.find((name) => text.includes(name));
					if (rule) {
						context.report({ loc: comment.loc, messageId: 'noDisable', data: { rule } });
					}
				}
			},
		};
	},
});
