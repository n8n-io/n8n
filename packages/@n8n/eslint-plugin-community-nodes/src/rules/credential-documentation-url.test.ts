import { RuleTester } from '@typescript-eslint/rule-tester';
import { CredentialDocumentationUrlRule } from './credential-documentation-url.js';

const ruleTester = new RuleTester();

function createCredentialCode(documentationUrl: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	documentationUrl = '${documentationUrl}';

	properties: INodeProperties[] = [];
}`;
}

function createCredentialWithoutDocUrl(): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';

	properties: INodeProperties[] = [];
}`;
}

function createRegularClass(): string {
	return `
export class RegularClass {
	documentationUrl = 'invalid-url';
}`;
}

ruleTester.run('credential-documentation-url', CredentialDocumentationUrlRule, {
	valid: [
		{
			name: 'valid URL with default options (URLs only)',
			code: createCredentialCode('https://example.com/docs'),
		},
		{
			name: 'valid URL with explicit options',
			code: createCredentialCode('https://example.com/docs'),
			options: [{ allowUrls: true, allowSlugs: false }],
		},
		{
			name: 'valid slug when slugs are allowed',
			code: createCredentialCode('myService'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid slug with slashes when slugs are allowed',
			code: createCredentialCode('myService/advanced/config'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid URL when both URLs and slugs are allowed',
			code: createCredentialCode('https://example.com/docs'),
			options: [{ allowUrls: true, allowSlugs: true }],
		},
		{
			name: 'valid slug when both URLs and slugs are allowed',
			code: createCredentialCode('myService/config'),
			options: [{ allowUrls: true, allowSlugs: true }],
		},
		{
			name: 'credential without documentationUrl should not trigger',
			code: createCredentialWithoutDocUrl(),
		},
		{
			name: 'class not implementing ICredentialType should be ignored',
			code: createRegularClass(),
		},
		{
			name: 'valid camelCase slug with multiple segments',
			code: createCredentialCode('myService/someFeature/advancedConfig'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
	],
	invalid: [
		{
			name: 'invalid URL with default options',
			code: createCredentialCode('invalid-url'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'invalid-url',
						expectedFormats: 'a valid URL',
					},
				},
			],
		},
		{
			name: 'slug not allowed with default options',
			code: createCredentialCode('myService'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'myService',
						expectedFormats: 'a valid URL',
					},
				},
			],
		},
		{
			name: 'invalid slug format when slugs are allowed',
			code: createCredentialCode('My-Service'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'My-Service',
						expectedFormats: 'a camelCase slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug starting with uppercase when slugs are allowed',
			code: createCredentialCode('MyService'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'MyService',
						expectedFormats: 'a camelCase slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'invalid URL when only URLs are allowed',
			code: createCredentialCode('not-a-valid-url'),
			options: [{ allowUrls: true, allowSlugs: false }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'not-a-valid-url',
						expectedFormats: 'a valid URL',
					},
				},
			],
		},
		{
			name: 'invalid when neither URLs nor slugs are allowed',
			code: createCredentialCode('https://example.com'),
			options: [{ allowUrls: false, allowSlugs: false }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'https://example.com',
						expectedFormats: 'a valid format (none configured)',
					},
				},
			],
		},
		{
			name: 'slug with invalid characters',
			code: createCredentialCode('my-service/config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'my-service/config',
						expectedFormats: 'a camelCase slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug with segment starting with uppercase',
			code: createCredentialCode('myService/Config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'myService/Config',
						expectedFormats: 'a camelCase slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'invalid value when both formats are allowed - shows both in error message',
			code: createCredentialCode('Invalid-Value!'),
			options: [{ allowUrls: true, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'Invalid-Value!',
						expectedFormats: 'a valid URL or a camelCase slug (can contain slashes)',
					},
				},
			],
		},
	],
});
