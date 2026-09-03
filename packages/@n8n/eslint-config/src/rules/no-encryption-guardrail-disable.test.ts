import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoDeploymentKeyDeleteRule } from './no-deployment-key-delete.js';
import { NoEncryptionGuardrailDisableRule } from './no-encryption-guardrail-disable.js';
import { NoLegacyCipherMethodsRule } from './no-legacy-cipher-methods.js';
import { NoMisplacedCipherPrimitivesRule } from './no-misplaced-cipher-primitives.js';

// Register the guarded rules so ESLint can resolve the disable directives under
// test (an unknown rule name in a directive would emit an extra "rule not found"
// error). The directives target these rules; only the rule under test runs.
const ruleTester = new RuleTester({
	// The disable directives under test intentionally guard rules that report
	// nothing here; don't let the unused-directive check add its own problems.
	linterOptions: { reportUnusedDisableDirectives: 'off' },
	plugins: {
		'n8n-local-rules': {
			rules: {
				'no-legacy-cipher-methods': NoLegacyCipherMethodsRule,
				'no-misplaced-cipher-primitives': NoMisplacedCipherPrimitivesRule,
				'no-deployment-key-delete': NoDeploymentKeyDeleteRule,
				'no-encryption-guardrail-disable': NoEncryptionGuardrailDisableRule,
			},
		},
	},
});

ruleTester.run('no-encryption-guardrail-disable', NoEncryptionGuardrailDisableRule, {
	valid: [
		// A plain comment mentioning a rule name is not a disable directive
		{
			code: '// enforced by n8n-local-rules/no-legacy-cipher-methods\nconst a = 1;',
		},
		// Disabling unrelated rules is fine
		{
			code: '// eslint-disable-next-line no-console\nconsole.log("x");',
		},
	],
	invalid: [
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-legacy-cipher-methods\nconst a = 1;',
			errors: [{ messageId: 'noDisable', data: { rule: 'no-legacy-cipher-methods' } }],
		},
		{
			code: '/* eslint-disable n8n-local-rules/no-deployment-key-delete */\nconst a = 1;',
			errors: [{ messageId: 'noDisable', data: { rule: 'no-deployment-key-delete' } }],
		},
		{
			code: '// eslint-disable-line n8n-local-rules/no-misplaced-cipher-primitives',
			errors: [{ messageId: 'noDisable', data: { rule: 'no-misplaced-cipher-primitives' } }],
		},
		// Blanket line-form disables silence every rule on the target line
		{
			code: '// eslint-disable-next-line\nconst a = 1;',
			errors: [{ messageId: 'noBareDisable' }],
		},
		// Disabling this rule itself (to disable a guarded rule on the next
		// line) is caught: a -next-line directive cannot suppress the report
		// emitted at its own line.
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-encryption-guardrail-disable\nconst a = 1;',
			errors: [{ messageId: 'noDisable', data: { rule: 'no-encryption-guardrail-disable' } }],
		},
	],
});
