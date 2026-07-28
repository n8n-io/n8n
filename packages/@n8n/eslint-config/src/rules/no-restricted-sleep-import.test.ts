import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepImportRule } from './no-restricted-sleep-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-import', NoRestrictedSleepImportRule, {
	valid: [
		{ code: 'import { sleep } from "@n8n/utils/sleep"' },
		{ code: 'import { retry } from "@n8n/utils/retry"' },
		{ code: 'import { something } from "n8n-workflow"' },
		{ code: 'function sleep() {}', filename: '/repo/packages/@n8n/utils/src/sleep.ts' },
		{
			code: 'const sleepWithAbort = () => {};',
			filename: '/repo/packages/@n8n/utils/src/sleep.ts',
		},
		{
			code: 'function sleep(ms: number) {}',
			filename: '/repo/packages/@n8n/typeorm/test/utils/test-utils.ts',
		},
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
		{
			code: 'function sleep(ms: number) {}',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
		{
			code: 'async function sleepWithAbort(ms: number, signal: AbortSignal) {}',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
		{
			code: 'const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
	],
});
