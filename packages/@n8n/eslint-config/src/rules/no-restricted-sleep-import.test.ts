import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepImportRule } from './no-restricted-sleep-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-import', NoRestrictedSleepImportRule, {
	valid: [
		{ code: 'import { sleep } from "@n8n/utils/sleep"' },
		{ code: 'import { retry } from "@n8n/utils/retry"' },
		{ code: 'import { something } from "n8n-workflow"' },
	],

	invalid: [
		{
			code: 'import { sleep } from "n8n-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
		{
			code: 'import { sleep } from "@n8n/utils"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
	],
});
