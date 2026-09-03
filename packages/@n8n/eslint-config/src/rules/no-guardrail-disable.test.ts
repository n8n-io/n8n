import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoGuardrailDisableRule } from './no-guardrail-disable.js';
import { MisplacedN8nTypeormImportRule } from './misplaced-n8n-typeorm-import.js';
import { NoUnsealedWorkflowEntityWriteRule } from './no-unsealed-workflow-entity-write.js';

// Register the guarded rules so ESLint can resolve the disable directives under test (an
// unknown rule name in a directive would emit an extra "rule not found" error).
const ruleTester = new RuleTester({
	linterOptions: { reportUnusedDisableDirectives: 'off' },
	plugins: {
		'n8n-local-rules': {
			rules: {
				'misplaced-n8n-typeorm-import': MisplacedN8nTypeormImportRule,
				'no-unsealed-workflow-entity-write': NoUnsealedWorkflowEntityWriteRule,
			},
		},
	},
});

const options: [{ guarded: Array<{ rule: string; message: string }> }] = [
	{
		guarded: [
			{ rule: 'misplaced-n8n-typeorm-import', message: 'Add the file to the allowlist.' },
			{ rule: 'no-unsealed-workflow-entity-write', message: 'Use `updateContent`.' },
		],
	},
];

ruleTester.run('no-guardrail-disable', NoGuardrailDisableRule, {
	valid: [
		// Unrelated disable directives are fine.
		{ code: '// eslint-disable-next-line no-console\nconsole.log("x");', options },
		// A plain comment mentioning the rule name is not a disable directive.
		{ code: '// see misplaced-n8n-typeorm-import for context', options },
		// With no guarded rules configured, nothing is reported.
		{
			code: '// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import\nexport const x = 1;',
		},
	],
	invalid: [
		{
			code: '// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import\nexport const x = 1;',
			options,
			errors: [
				{
					messageId: 'noDisable',
					data: { rule: 'misplaced-n8n-typeorm-import', message: 'Add the file to the allowlist.' },
				},
			],
		},
		{
			code: '/* eslint-disable n8n-local-rules/no-unsealed-workflow-entity-write */',
			options,
			errors: [
				{
					messageId: 'noDisable',
					data: { rule: 'no-unsealed-workflow-entity-write', message: 'Use `updateContent`.' },
				},
			],
		},
		{
			code: 'export const x = 1; // eslint-disable-line n8n-local-rules/no-unsealed-workflow-entity-write',
			options,
			errors: [{ messageId: 'noDisable' }],
		},
	],
});
