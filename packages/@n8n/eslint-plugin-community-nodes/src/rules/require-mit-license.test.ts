import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireMitLicenseRule } from './require-mit-license.js';

const ruleTester = new RuleTester();

ruleTester.run('require-mit-license', RequireMitLicenseRule, {
	valid: [
		{
			name: 'license is MIT',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "license": "MIT" }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example", "license": "Apache-2.0" }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "license": "MIT", "config": { "license": "Apache-2.0" } }',
		},
		{
			name: 'objects inside arrays are not flagged',
			filename: 'package.json',
			code: `{
				"name": "n8n-nodes-example",
				"license": "MIT",
				"contributors": [
					{ "name": "Alice" },
					{ "name": "Bob" }
				]
			}`,
		},
	],
	invalid: [
		{
			name: 'missing license field',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			output: '{ "name": "n8n-nodes-example", "version": "1.0.0", "license": "MIT" }',
			errors: [{ messageId: 'missingLicense' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			output: '{ "license": "MIT" }',
			errors: [{ messageId: 'missingLicense' }],
		},
		{
			name: 'wrong license value',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "license": "Apache-2.0" }',
			output: '{ "name": "n8n-nodes-example", "license": "MIT" }',
			errors: [{ messageId: 'wrongLicense' }],
		},
		{
			name: 'case-mismatched license value',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "license": "mit" }',
			output: '{ "name": "n8n-nodes-example", "license": "MIT" }',
			errors: [{ messageId: 'wrongLicense' }],
		},
	],
});
