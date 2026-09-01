import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireVersionRule } from './require-version.js';

const ruleTester = new RuleTester();

ruleTester.run('require-version', RequireVersionRule, {
	valid: [
		{
			name: 'version is a valid semver string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'version with pre-release and build metadata',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.2.3-beta.1+build.5" }',
		},
		{
			name: 'zero version is valid',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "0.1.0" }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'nested objects with missing version are not checked',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0", "config": { "nested": "value" } }',
		},
		{
			name: 'objects inside arrays (e.g. contributors) are not flagged',
			filename: 'package.json',
			code: `{
				"name": "n8n-nodes-example",
				"version": "1.0.0",
				"contributors": [
					{ "name": "Alice", "email": "alice@example.com" }
				]
			}`,
		},
	],
	invalid: [
		{
			name: 'version field is missing entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "description": "Example" }',
			errors: [{ messageId: 'missingVersion' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			errors: [{ messageId: 'missingVersion' }],
		},
		{
			name: 'version is an empty string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "" }',
			errors: [{ messageId: 'invalidVersion' }],
		},
		{
			name: 'version is not a valid semver',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0" }',
			errors: [{ messageId: 'invalidVersion' }],
		},
		{
			name: 'version has a leading "v"',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "v1.0.0" }',
			errors: [{ messageId: 'invalidVersion' }],
		},
		{
			name: 'version is a range, not an exact version',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "^1.0.0" }',
			errors: [{ messageId: 'invalidVersion' }],
		},
		{
			name: 'version is a number, not a string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": 1 }',
			errors: [{ messageId: 'invalidVersion' }],
		},
	],
});
