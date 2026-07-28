import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepDefinitionRule } from './no-restricted-sleep-definition.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-definition', NoRestrictedSleepDefinitionRule, {
	valid: [
		{ code: 'import { sleep } from "@n8n/utils/sleep"' },
		{ code: 'import { sleep } from "n8n-workflow"' },
		{ code: 'import { sleep } from "zx"' },
		{ code: 'import { sleep } from "./sleep"' },
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
		{
			code: 'export async function sleep(ms: number) {}',
			filename: '/repo/packages/@n8n/node-cli/src/commands/dev/utils.ts',
		},
	],

	invalid: [
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
