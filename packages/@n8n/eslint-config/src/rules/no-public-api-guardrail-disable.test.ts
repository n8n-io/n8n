import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoPublicApiGuardrailDisableRule } from './no-public-api-guardrail-disable.js';
import { NoRepositoryInPublicApiHandlerRule } from './no-repository-in-public-api-handler.js';
import { RequirePublicApiControllerRule } from './require-public-api-controller.js';

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
				'no-repository-in-public-api-handler': NoRepositoryInPublicApiHandlerRule,
				'require-public-api-controller': RequirePublicApiControllerRule,
			},
		},
	},
});

ruleTester.run('no-public-api-guardrail-disable', NoPublicApiGuardrailDisableRule, {
	valid: [
		// Unrelated disable directives are fine.
		{ code: '// eslint-disable-next-line no-console\nconsole.log("x");' },
		// A plain comment mentioning the rule name is not a disable directive.
		{ code: '// see require-public-api-controller for context' },
	],
	invalid: [
		{
			code: '// eslint-disable-next-line n8n-local-rules/require-public-api-controller\nexport const x = 1;',
			errors: [{ messageId: 'noDisable', data: { rule: 'require-public-api-controller' } }],
		},
		{
			code: '/* eslint-disable n8n-local-rules/no-repository-in-public-api-handler */',
			errors: [{ messageId: 'noDisable', data: { rule: 'no-repository-in-public-api-handler' } }],
		},
	],
});
