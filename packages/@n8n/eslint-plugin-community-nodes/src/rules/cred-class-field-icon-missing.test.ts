import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassFieldIconMissingRule } from './cred-class-field-icon-missing.js';

const ruleTester = new RuleTester();

const credFilePath = '/tmp/TestCredential.credentials.ts';
const nonCredFilePath = '/tmp/SomeHelper.ts';

function createCredentialCode(withIcon: boolean): string {
	const iconLine = withIcon ? "\n\ticon = 'file:testCredential.svg' as const;" : '';
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	documentationUrl = 'https://docs.example.com';${iconLine}

	properties: INodeProperties[] = [];
}`;
}

function createCredentialWithLightDarkIcon(): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	icon = { light: 'file:testCredential.svg', dark: 'file:testCredential.dark.svg' } as const;

	properties: INodeProperties[] = [];
}`;
}

function createRegularClass(): string {
	return `
export class RegularClass {
	name = 'test';
}`;
}

ruleTester.run('cred-class-field-icon-missing', CredClassFieldIconMissingRule, {
	valid: [
		{
			name: 'credential with icon defined',
			filename: credFilePath,
			code: createCredentialCode(true),
		},
		{
			name: 'credential with light/dark icon object',
			filename: credFilePath,
			code: createCredentialWithLightDarkIcon(),
		},
		{
			name: 'class not implementing ICredentialType is ignored',
			filename: credFilePath,
			code: createRegularClass(),
		},
		{
			name: 'non-.credentials.ts file is ignored',
			filename: nonCredFilePath,
			code: createCredentialCode(false),
		},
	],
	invalid: [
		{
			name: 'credential missing icon property',
			filename: credFilePath,
			code: createCredentialCode(false),
			errors: [
				{
					messageId: 'missingIcon',
					suggestions: [
						{
							messageId: 'addPlaceholder',
							output: `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	documentationUrl = 'https://docs.example.com';

	properties: INodeProperties[] = [];

	icon = "file:./icon.svg";
}`,
						},
					],
				},
			],
		},
	],
});
