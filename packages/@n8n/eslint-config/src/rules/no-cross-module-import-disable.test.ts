import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoCrossModuleImportDisableRule } from './no-cross-module-import-disable.js';
import { NoUndeclaredCrossModuleImportRule } from './no-undeclared-cross-module-import.js';

// The guarded rule is registered so directive rule names resolve; only the rule under test runs.
const ruleTester = new RuleTester({
	// the directives under test are intentionally "unused" (the guarded rule reports nothing here)
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
