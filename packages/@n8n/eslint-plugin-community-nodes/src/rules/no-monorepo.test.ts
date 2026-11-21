import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoMonorepoRule } from './no-monorepo.js';

const ruleTester = new RuleTester();

ruleTester.run('no-monorepo', NoMonorepoRule, {
	valid: [
		{
			name: 'package without repository metadata',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'repository without a directory',
			filename: 'package.json',
			code: '{ "repository": { "type": "git", "url": "https://example.com/repo" } }',
		},
		...['.', './', '././'].map((directory) => ({
			name: `root directory ${directory}`,
			filename: 'package.json',
			code: `{ "repository": { "directory": "${directory}" } }`,
		})),
		{
			name: 'non-package manifest',
			filename: 'other.json',
			code: '{ "repository": { "directory": "packages/foo" } }',
		},
	],
	invalid: [
		{
			name: 'nested package directory',
			filename: 'package.json',
			code: '{ "repository": { "directory": "packages/foo" } }',
			errors: [{ messageId: 'monorepoNotSupported' }],
		},
	],
});
