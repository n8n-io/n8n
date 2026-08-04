import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoOverridesFieldRule } from './no-overrides-field.js';

const ruleTester = new RuleTester();

ruleTester.run('no-overrides-field', NoOverridesFieldRule, {
	valid: [
		{
			name: 'no overrides field',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'package.json with dependencies but no overrides',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*" } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "overrides": { "axios": "1.0.0" } }',
		},
		{
			name: 'nested "overrides" key inside another field is allowed',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "config": { "overrides": { "axios": "1.0.0" } } }',
		},
	],
	invalid: [
		{
			name: 'overrides as object is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "overrides": { "axios": "1.0.0" } }',
			errors: [{ messageId: 'overridesForbidden' }],
		},
		{
			name: 'empty overrides object is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "overrides": {} }',
			errors: [{ messageId: 'overridesForbidden' }],
		},
		{
			name: 'real-world overrides (CNOC-404 Sinch) is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-sinch", "overrides": { "axios": "1.7.0", "fast-xml-parser": "4.4.0", "minimatch": "9.0.5", "@langchain/core": "0.3.0", "qs": "6.13.0" } }',
			errors: [{ messageId: 'overridesForbidden' }],
		},
	],
});
