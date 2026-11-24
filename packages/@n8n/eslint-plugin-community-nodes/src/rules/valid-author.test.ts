import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidAuthorRule } from './valid-author.js';

const ruleTester = new RuleTester();

ruleTester.run('valid-author', ValidAuthorRule, {
	valid: [
		{
			name: 'author object with non-empty name and email',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "author": { "name": "Jane Doe", "email": "jane@example.com" } }',
		},
		{
			name: 'author object with extra fields',
			filename: 'package.json',
			code: '{ "author": { "name": "Jane Doe", "email": "jane@example.com", "url": "https://example.com" } }',
		},
		{
			name: 'author shorthand string with name and email',
			filename: 'package.json',
			code: '{ "author": "Jane Doe <jane@example.com>" }',
		},
		{
			name: 'author shorthand string with name, email and url',
			filename: 'package.json',
			code: '{ "author": "Jane Doe <jane@example.com> (https://example.com)" }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "author": { "name": "Jane Doe", "email": "jane@example.com" }, "config": { "nested": "value" } }',
		},
	],
	invalid: [
		{
			name: 'missing author field entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'authorMissing' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			errors: [{ messageId: 'authorMissing' }],
		},
		{
			name: 'author object missing email',
			filename: 'package.json',
			code: '{ "author": { "name": "Jane Doe" } }',
			errors: [{ messageId: 'authorEmailMissing' }],
		},
		{
			name: 'author object missing name',
			filename: 'package.json',
			code: '{ "author": { "email": "jane@example.com" } }',
			errors: [{ messageId: 'authorNameMissing' }],
		},
		{
			name: 'author object with empty name and email strings',
			filename: 'package.json',
			code: '{ "author": { "name": "", "email": "  " } }',
			errors: [{ messageId: 'authorNameMissing' }, { messageId: 'authorEmailMissing' }],
		},
		{
			name: 'author object with non-string name',
			filename: 'package.json',
			code: '{ "author": { "name": 123, "email": "jane@example.com" } }',
			errors: [{ messageId: 'authorNameMissing' }],
		},
		{
			name: 'author shorthand string with name only',
			filename: 'package.json',
			code: '{ "author": "Jane Doe" }',
			errors: [{ messageId: 'authorEmailMissing' }],
		},
		{
			name: 'author shorthand string with email only',
			filename: 'package.json',
			code: '{ "author": "<jane@example.com>" }',
			errors: [{ messageId: 'authorNameMissing' }],
		},
		{
			name: 'author shorthand string with empty email angle brackets',
			filename: 'package.json',
			code: '{ "author": "Jane Doe <>" }',
			errors: [{ messageId: 'authorEmailMissing' }],
		},
		{
			name: 'empty author string',
			filename: 'package.json',
			code: '{ "author": "" }',
			errors: [{ messageId: 'authorNameMissing' }, { messageId: 'authorEmailMissing' }],
		},
		{
			name: 'author as empty array',
			filename: 'package.json',
			code: '{ "author": [] }',
			errors: [{ messageId: 'authorMissing' }],
		},
	],
});
