import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoCrossModuleImportDisableRule } from './no-cross-module-import-disable.js';
import { NoUndeclaredCrossModuleImportRule } from './no-undeclared-cross-module-import.js';

// Register the guarded rule so ESLint can resolve the disable directives under
// test (an unknown rule name in a directive would emit an extra "rule not found"
// error). The directives target that rule; only the rule under test runs.
const ruleTester = new RuleTester({
	// The disable directives under test intentionally guard a rule that reports
	// nothing here; don't let the unused-directive check add its own problems.
	linterOptions: { reportUnusedDisableDirectives: 'off' },
	plugins: {
		'n8n-local-rules': {
			rules: {
				'no-undeclared-cross-module-import': NoUndeclaredCrossModuleImportRule,
			},
		},
	},
});

ruleTester.run('no-cross-module-import-disable', NoCrossModuleImportDisableRule, {
	valid: [
		{ code: "import { foo } from 'bar';" },
		// Disabling other rules is fine.
		{ code: '// eslint-disable-next-line no-console\nconsole.log("x");' },
		// Mentioning the rule outside a disable directive is fine.
		{ code: '// see no-undeclared-cross-module-import for boundary semantics' },
	],
	invalid: [
		{
			code: "// eslint-disable-next-line n8n-local-rules/no-undeclared-cross-module-import\nimport { foo } from '@/modules/favorites/favorites.service';",
			errors: [{ messageId: 'noDisable' }],
		},
		{
			code: '/* eslint-disable n8n-local-rules/no-undeclared-cross-module-import */',
			errors: [{ messageId: 'noDisable' }],
		},
		{
			code: "import { foo } from '@/modules/favorites/favorites.service'; // eslint-disable-line n8n-local-rules/no-undeclared-cross-module-import",
			errors: [{ messageId: 'noDisable' }],
		},
	],
});
