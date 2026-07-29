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
			name: 'valid lowercase slug when slugs are allowed',
			code: createCredentialCode('myservice'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid lowercase slug with slashes when slugs are allowed',
			code: createCredentialCode('myservice/advanced/config'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid URL when both URLs and slugs are allowed',
			code: createCredentialCode('https://example.com/docs'),
			options: [{ allowUrls: true, allowSlugs: true }],
		},
		{
			name: 'valid lowercase slug when both URLs and slugs are allowed',
			code: createCredentialCode('myservice/config'),
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
			name: 'valid lowercase slug with multiple segments',
			code: createCredentialCode('myservice/somefeature/advancedconfig'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid lowercase alphanumeric slug',
			code: createCredentialCode('myservice123'),
			options: [{ allowUrls: false, allowSlugs: true }],
		},
		{
			name: 'valid lowercase alphanumeric slug with slashes',
			code: createCredentialCode('myservice123/config456'),
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
			code: createCredentialCode('myservice'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'myservice',
						expectedFormats: 'a valid URL',
					},
				},
			],
		},
		{
			name: 'slug with special characters should not be autofixable',
			code: createCredentialCode('My-Service'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'My-Service',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'uppercase slug should be autofixable',
			code: createCredentialCode('MyService'),
			options: [{ allowUrls: false, allowSlugs: true }],
			output: createCredentialCode('myservice'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'MyService',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
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
			name: 'slug with invalid characters (special chars) should not be autofixable',
			code: createCredentialCode('my@service/config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'my@service/config',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug with uppercase segment should be autofixable',
			code: createCredentialCode('myService/Config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			output: createCredentialCode('myservice/config'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'myService/Config',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug with hyphens should not be autofixable',
			code: createCredentialCode('myservice/advanced-config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'myservice/advanced-config',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug with underscores should not be autofixable',
			code: createCredentialCode('my_service/config_advanced'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'my_service/config_advanced',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
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
						expectedFormats: 'a valid URL or a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'empty string should be invalid with default options',
			code: createCredentialCode(''),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: '',
						expectedFormats: 'a valid URL',
					},
				},
			],
		},
		{
			name: 'empty string should be invalid when slugs are allowed',
			code: createCredentialCode(''),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: '',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'mixed case slug with numbers should be autofixable',
			code: createCredentialCode('MyService123/Config456'),
			options: [{ allowUrls: false, allowSlugs: true }],
			output: createCredentialCode('myservice123/config456'),
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: 'MyService123/Config456',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
		{
			name: 'slug starting with number should be invalid and not autofixable',
			code: createCredentialCode('123service/config'),
			options: [{ allowUrls: false, allowSlugs: true }],
			errors: [
				{
					messageId: 'invalidDocumentationUrl',
					data: {
						value: '123service/config',
						expectedFormats: 'a lowercase alphanumeric slug (can contain slashes)',
					},
				},
			],
		},
	],
});
