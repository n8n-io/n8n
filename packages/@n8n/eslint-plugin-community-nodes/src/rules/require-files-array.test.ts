import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireFilesArrayRule } from './require-files-array.js';

const ruleTester = new RuleTester();

ruleTester.run('require-files-array', RequireFilesArrayRule, {
	valid: [
		{
			name: 'files array with entries',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "files": ["dist"] }',
		},
		{
			name: 'files array with multiple entries',
			filename: 'package.json',
			code: '{ "files": ["dist", "credentials"] }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
	],
	invalid: [
		{
			name: 'missing files field entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'filesMissing' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			errors: [{ messageId: 'filesMissing' }],
		},
		{
			name: 'files as empty array',
			filename: 'package.json',
			code: '{ "files": [] }',
			errors: [{ messageId: 'filesEmpty' }],
		},
		{
			name: 'files as string instead of array',
			filename: 'package.json',
			code: '{ "files": "dist" }',
			errors: [{ messageId: 'filesEmpty' }],
		},
		{
			name: 'files as non-array value',
			filename: 'package.json',
			code: '{ "files": null }',
			errors: [{ messageId: 'filesEmpty' }],
		},
	],
});
