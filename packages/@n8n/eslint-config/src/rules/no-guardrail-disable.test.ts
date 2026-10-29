import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoGuardrailDisableRule } from './no-guardrail-disable.js';
import { NoUnsealedCredentialsEntityWriteRule } from './no-unsealed-credentials-entity-write.js';
import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

// Register the guarded rules so ESLint can resolve the disable directives under test (an
// unknown rule name in a directive would emit an extra "rule not found" error). The `-audit`
// alias stands in for an unrelated rule whose ID contains a guarded name.
const ruleTester = new RuleTester({
	linterOptions: { reportUnusedDisableDirectives: 'off' },
	plugins: {
		'n8n-local-rules': {
			rules: {
				'no-unsealed-credentials-entity-write': NoUnsealedCredentialsEntityWriteRule,
				'no-unsealed-workflow-entity-write': NoUnsealedWorkflowEntityWriteRule,
				'no-unsealed-workflow-entity-write-audit': NoUnsealedWorkflowEntityWriteRule,
				'no-guardrail-disable': NoGuardrailDisableRule,
			},
		},
	},
});

const options: [{ guarded: Array<{ rule: string; message: string }> }] = [
	{
		guarded: [
			{ rule: 'no-unsealed-credentials-entity-write', message: 'Use `updateCredentials`.' },
			{ rule: 'no-unsealed-workflow-entity-write', message: 'Use `updateContent`.' },
		],
	},
];

const credentialsHit = {
	messageId: 'noDisable' as const,
	data: {
		rule: 'no-unsealed-credentials-entity-write',
		message: 'Use `updateCredentials`.',
	},
};
const sealHit = {
	messageId: 'noDisable' as const,
	data: { rule: 'no-unsealed-workflow-entity-write', message: 'Use `updateContent`.' },
};
const blanket = {
	messageId: 'noBlanketDisable' as const,
	data: { rules: 'no-unsealed-credentials-entity-write`, `no-unsealed-workflow-entity-write' },
};

ruleTester.run('no-guardrail-disable', NoGuardrailDisableRule, {
	valid: [
		// Unrelated disable directives are fine.
		{ code: '// eslint-disable-next-line no-console\nconsole.log("x");', options },
		{ code: '/* eslint-disable no-console, no-debugger */', options },
		// A plain comment mentioning the rule name is not a disable directive.
		{ code: '// see no-unsealed-credentials-entity-write for context', options },
		{ code: '// eslint-disable-next-line-ish no-unsealed-credentials-entity-write', options },
		// A guarded name inside the justification or inside another rule ID is not a match.
		{
			code: '// eslint-disable-next-line no-console -- mirrors no-unsealed-workflow-entity-write\nconsole.log("x");',
			options,
		},
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-unsealed-workflow-entity-write-audit\nexport const x = 1;',
			options,
		},
		// With no guarded rules configured, nothing is reported.
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-unsealed-credentials-entity-write\nexport const x = 1;',
		},
		{ code: '// eslint-disable-next-line\nexport const x = 1;' },
		// Ceiling: a blanket directive on the first line of the file leaves no position outside its
		// reach to report from, so it silences this rule too. Reviewers must catch these.
		{ code: '/* eslint-disable */\nexport const x = 1;', options },
		{ code: 'export const x = 1; // eslint-disable-line', options },
	],
	invalid: [
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-unsealed-credentials-entity-write\nexport const x = 1;',
			options,
			errors: [credentialsHit],
		},
		{
			code: '// oxlint-disable-next-line n8n-local-rules/no-unsealed-workflow-entity-write\nexport const x = 1;',
			options,
			errors: [sealHit],
		},
		{
			code: '/* eslint-disable n8n-local-rules/no-unsealed-workflow-entity-write */',
			options,
			errors: [sealHit],
		},
		{
			code: 'export const x = 1; // eslint-disable-line n8n-local-rules/no-unsealed-workflow-entity-write',
			options,
			errors: [sealHit],
		},
		// The prefix is optional in a directive, a justification does not hide the ID, and a list
		// reports every guarded rule it names.
		{
			code: '// eslint-disable-next-line n8n-local-rules/no-unsealed-workflow-entity-write -- legacy path\nexport const x = 1;',
			options,
			errors: [sealHit],
		},
		{
			code: '/* eslint-disable no-console,\n   n8n-local-rules/no-unsealed-credentials-entity-write, n8n-local-rules/no-unsealed-workflow-entity-write */',
			options,
			errors: [credentialsHit, sealHit],
		},
		// A directive with no rule list, or one that names this rule, disables the guarded rules too.
		{ code: '// eslint-disable-next-line\nexport const x = 1;', options, errors: [blanket] },
		{
			code: '// eslint-disable-next-line -- reason\nexport const x = 1;',
			options,
			errors: [blanket],
		},
		{
			code: 'export const y = 1;\nexport const x = 1; // eslint-disable-line',
			options,
			errors: [blanket],
		},
		{
			code: 'export const y = 1;\n/* eslint-disable */\nexport const x = 1;',
			options,
			errors: [blanket],
		},
		{
			code: 'export const y = 1;\n/* eslint-disable n8n-local-rules/no-guardrail-disable, n8n-local-rules/no-unsealed-credentials-entity-write */',
			options,
			errors: [blanket],
		},
		{
			code: 'export const y = 1;\nexport const x = 1; // eslint-disable-line n8n-local-rules/no-guardrail-disable, n8n-local-rules/no-unsealed-workflow-entity-write',
			options,
			errors: [blanket],
		},
	],
});
