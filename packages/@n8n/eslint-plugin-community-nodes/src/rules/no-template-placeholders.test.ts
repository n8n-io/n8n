import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoTemplatePlaceholdersRule } from './no-template-placeholders.js';

const ruleTester = new RuleTester();

ruleTester.run('no-template-placeholders', NoTemplatePlaceholdersRule, {
	valid: [
		{
			name: 'package.json with no placeholders',
			filename: 'package.json',
			code: `{
				"name": "n8n-nodes-example",
				"version": "1.0.0",
				"description": "An example community node",
				"homepage": "https://example.com",
				"repository": { "type": "git", "url": "git+https://github.com/acme/n8n-nodes-example.git" }
			}`,
		},
		{
			name: 'angle brackets that do not look like placeholders are ignored',
			filename: 'package.json',
			code: '{ "description": "Compares a < b values" }',
		},
		{
			name: 'single curly braces are ignored',
			filename: 'package.json',
			code: '{ "description": "Use { key: value } syntax" }',
		},
		{
			name: 'non-package.json file is ignored even if it has placeholders',
			filename: 'tsconfig.json',
			code: '{ "name": "<PACKAGE_NAME>" }',
		},
		{
			name: 'numeric and boolean values are not flagged',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "private": false, "engines": { "node": ">=18" } }',
		},
	],
	invalid: [
		{
			name: 'angle bracket placeholder in name',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-<PACKAGE_NAME>" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<PACKAGE_NAME>' },
				},
			],
		},
		{
			name: 'angle bracket placeholder in description',
			filename: 'package.json',
			code: '{ "description": "An n8n community node for <SERVICE>" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<SERVICE>' },
				},
			],
		},
		{
			name: 'angle bracket placeholder in repository url',
			filename: 'package.json',
			code: '{ "repository": { "type": "git", "url": "git+https://github.com/<USERNAME>/n8n-nodes-example.git" } }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<USERNAME>' },
				},
			],
		},
		{
			name: 'angle bracket placeholder in homepage',
			filename: 'package.json',
			code: '{ "homepage": "https://github.com/<USERNAME>/n8n-nodes-example#readme" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<USERNAME>' },
				},
			],
		},
		{
			name: 'mustache placeholder in author',
			filename: 'package.json',
			code: '{ "author": "{{ authorName }}" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '{{ authorName }}' },
				},
			],
		},
		{
			name: 'mustache placeholder inside larger string',
			filename: 'package.json',
			code: '{ "description": "Node by {{author}} for service" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '{{author}}' },
				},
			],
		},
		{
			name: 'placeholder in custom field',
			filename: 'package.json',
			code: '{ "n8n": { "n8nNodesApiVersion": 1, "credentials": ["<CREDENTIAL>"] } }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<CREDENTIAL>' },
				},
			],
		},
		{
			name: 'multiple placeholders in different fields are all reported',
			filename: 'package.json',
			code: '{ "name": "<NAME>", "description": "{{description}}" }',
			errors: [
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '<NAME>' },
				},
				{
					messageId: 'unresolvedPlaceholder',
					data: { pattern: '{{description}}' },
				},
			],
		},
	],
});
