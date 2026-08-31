import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDynamicImportTemplateRule } from './no-dynamic-import-template.js';

const ruleTester = new RuleTester();

ruleTester.run('no-dynamic-import-template', NoDynamicImportTemplateRule, {
	valid: [
		{
			code: 'await import(`./reporters/${name}.js`)',
		},
		{
			code: 'await import(`../reporters/${name}.mjs`)',
		},
		{
			code: 'await import(`./data/${name}.json`)',
		},
		{
			code: "await import('./reporters/credentials.js')",
		},
		{
			code: 'await import(`n8n-nodes-base/${name}`)',
		},
	],
	invalid: [
		{
			code: 'await import(`@/security-audit/${name}.js`)',
			errors: [{ messageId: 'noDynamicImportTemplate' }],
		},
		{
			code: 'await import(`./reporters/${name}`)',
			errors: [{ messageId: 'missingExtension' }],
		},
		{
			code: 'await import(`../reporters/${name}`)',
			errors: [{ messageId: 'missingExtension' }],
		},
		{
			code: 'await import(`./reporters/${name}.ts`)',
			errors: [{ messageId: 'missingExtension' }],
		},
	],
});
