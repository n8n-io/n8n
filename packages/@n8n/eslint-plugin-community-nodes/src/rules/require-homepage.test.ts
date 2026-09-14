import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireHomepageRule } from './require-homepage.js';

const ruleTester = new RuleTester();

ruleTester.run('require-homepage', RequireHomepageRule, {
	valid: [
		{
			name: 'homepage with an https url',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "homepage": "https://example.com" }',
		},
		{
			name: 'homepage with a repository url and path',
			filename: 'package.json',
			code: '{ "homepage": "https://github.com/acme/n8n-nodes-example#readme" }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "homepage": "https://example.com", "config": { "nested": "value" } }',
		},
	],
	invalid: [
		{
			name: 'missing homepage field entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'homepageMissing' }],
		},
		{
			name: 'empty package.json object',
			filename: 'package.json',
			code: '{}',
			errors: [{ messageId: 'homepageMissing' }],
		},
		{
			name: 'empty homepage string',
			filename: 'package.json',
			code: '{ "homepage": "" }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
		{
			name: 'whitespace-only homepage string',
			filename: 'package.json',
			code: '{ "homepage": "   " }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
		{
			name: 'homepage without a protocol',
			filename: 'package.json',
			code: '{ "homepage": "example.com" }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
		{
			name: 'placeholder homepage value',
			filename: 'package.json',
			code: '{ "homepage": "TODO" }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
		{
			name: 'non-string homepage value',
			filename: 'package.json',
			code: '{ "homepage": 123 }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
		{
			name: 'null homepage value',
			filename: 'package.json',
			code: '{ "homepage": null }',
			errors: [{ messageId: 'homepageInvalid' }],
		},
	],
});
