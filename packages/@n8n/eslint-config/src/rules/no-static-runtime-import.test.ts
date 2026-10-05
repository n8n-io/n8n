import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoStaticRuntimeImportRule } from './no-static-runtime-import.js';

const ruleTester = new RuleTester();
const options: [{ paths: Array<{ name: string; message: string }> }] = [
	{ paths: [{ name: 'heavy-sdk', message: 'Load this module lazily.' }] },
];

ruleTester.run('no-static-runtime-import', NoStaticRuntimeImportRule, {
	valid: [
		{ code: "import type { Client } from 'heavy-sdk';", options },
		{ code: "import { type Client } from 'heavy-sdk';", options },
		{ code: "const { Client } = await import('heavy-sdk');", options },
		{ code: "import { Client } from 'other-sdk';", options },
		{ code: "export type { Client } from 'heavy-sdk';", options },
		{ code: "export { type Client } from 'heavy-sdk';", options },
		{ code: "export type * from 'heavy-sdk';", options },
	],
	invalid: [
		{
			code: "import { Client } from 'heavy-sdk';",
			options,
			errors: [{ messageId: 'restrictedImport' }],
		},
		{
			code: "import HeavySdk from 'heavy-sdk';",
			options,
			errors: [{ messageId: 'restrictedImport' }],
		},
		{
			code: "import 'heavy-sdk';",
			options,
			errors: [{ messageId: 'restrictedImport' }],
		},
		{
			code: "export { Client } from 'heavy-sdk';",
			options,
			errors: [{ messageId: 'restrictedImport' }],
		},
		{
			code: "export * from 'heavy-sdk';",
			options,
			errors: [{ messageId: 'restrictedImport' }],
		},
	],
});
