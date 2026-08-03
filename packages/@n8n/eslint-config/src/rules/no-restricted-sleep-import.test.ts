import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepImportRule } from './no-restricted-sleep-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-import', NoRestrictedSleepImportRule, {
	valid: [
		{ code: 'import { sleep } from "@n8n/utils/sleep"' },
		{ code: 'import { sleep } from "zx"' },
		{ code: 'import { sleep } from "./sleep"' },
		{ code: 'import { jsonParse } from "n8n-workflow"' },
		// Namespace imports say nothing about what they use — the generated
		// `vi.importActual` shape relies on this.
		{ code: 'import type * as _importType0 from "n8n-workflow"' },
		{ code: 'import * as n8nWorkflow from "n8n-workflow"' },
	],

	invalid: [
		{
			code: 'import { sleep } from "n8n-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
		{
			code: 'import { sleep as delay } from "n8n-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
		{
			code: 'import { jsonParse, sleep } from "n8n-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
	],
});
