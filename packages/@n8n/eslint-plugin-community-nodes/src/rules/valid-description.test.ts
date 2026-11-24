import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidDescriptionRule } from './valid-description.js';

const ruleTester = new RuleTester();

ruleTester.run('valid-description', ValidDescriptionRule, {
	valid: [
		{
			name: 'description is a non-empty string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "description": "Nodes for talking to Acme Corp\'s API" }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'nested objects with empty description are not checked',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "description": "Real description", "config": { "description": "" } }',
		},
		{
			name: 'objects inside arrays (e.g. contributors) are not flagged',
			filename: 'package.json',
			code: `{
				"name": "n8n-nodes-example",
				"description": "Real description",
				"contributors": [
					{ "name": "Alice", "description": "" }
				]
			}`,
		},
	],
	invalid: [
		{
			name: 'description field is missing entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'missingDescription' }],
		},
		{
			name: 'description is an empty string (starter template default)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "description": "" }',
			errors: [{ messageId: 'emptyDescription' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			errors: [{ messageId: 'missingDescription' }],
		},
	],
});
