import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireCommunityNodeKeywordRule } from './require-community-node-keyword.js';

const ruleTester = new RuleTester();

ruleTester.run('require-community-node-keyword', RequireCommunityNodeKeywordRule, {
	valid: [
		{
			name: 'keywords array contains required keyword',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": ["n8n-community-node-package"] }',
		},
		{
			name: 'keywords array contains required keyword among others',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": ["n8n", "automation", "n8n-community-node-package", "workflow"] }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": ["n8n-community-node-package"], "config": { "nested": "value" } }',
		},
		{
			name: 'objects inside arrays (e.g. contributors) are not flagged',
			filename: 'package.json',
			code: `{
				"name": "n8n-nodes-example",
				"keywords": ["n8n-community-node-package"],
				"contributors": [
					{ "name": "Alice", "email": "alice@example.com" },
					{ "name": "Bob", "email": "bob@example.com" }
				]
			}`,
		},
	],
	invalid: [
		{
			name: 'missing keywords array entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			output:
				'{ "name": "n8n-nodes-example", "version": "1.0.0", "keywords": ["n8n-community-node-package"] }',
			errors: [{ messageId: 'missingKeywordsArray' }],
		},
		{
			name: 'empty keywords array',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": [] }',
			output: '{ "name": "n8n-nodes-example", "keywords": ["n8n-community-node-package"] }',
			errors: [{ messageId: 'missingKeyword' }],
		},
		{
			name: 'keywords array without the required keyword',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": ["n8n", "automation"] }',
			output:
				'{ "name": "n8n-nodes-example", "keywords": ["n8n", "automation", "n8n-community-node-package"] }',
			errors: [{ messageId: 'missingKeyword' }],
		},
		{
			name: 'keywords array with similar but incorrect keyword',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "keywords": ["n8n-community-node"] }',
			output:
				'{ "name": "n8n-nodes-example", "keywords": ["n8n-community-node", "n8n-community-node-package"] }',
			errors: [{ messageId: 'missingKeyword' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			output: '{ "keywords": ["n8n-community-node-package"] }',
			errors: [{ messageId: 'missingKeywordsArray' }],
		},
	],
});
