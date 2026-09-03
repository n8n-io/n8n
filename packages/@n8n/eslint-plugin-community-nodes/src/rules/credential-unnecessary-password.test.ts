import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredentialUnnecessaryPasswordRule } from './credential-unnecessary-password.js';

const ruleTester = new RuleTester();

function createCredentialCode(properties: string[]): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';

	properties: INodeProperties[] = [
${properties.map((prop) => `\t\t${prop}`).join(',\n')},
	];
}`;
}

function createProperty(
	displayName: string,
	name: string,
	options: { password?: boolean } = {},
): string {
	const typeOptionsStr =
		options.password !== undefined ? `\n\t\t\ttypeOptions: { password: ${options.password} },` : '';

	return `{
			displayName: '${displayName}',
			name: '${name}',
			type: 'string',
			default: '',${typeOptionsStr}
		}`;
}

function createRegularClass(): string {
	return `
export class RegularClass {
	properties = [
		{
			name: 'region',
			type: 'string',
			typeOptions: { password: true },
		},
	];
}`;
}

ruleTester.run('credential-unnecessary-password', CredentialUnnecessaryPasswordRule, {
	valid: [
		{
			name: 'non-sensitive field without password option',
			code: createCredentialCode([createProperty('Region', 'region')]),
		},
		{
			name: 'non-sensitive field with password: false',
			code: createCredentialCode([createProperty('Base URL', 'baseUrl', { password: false })]),
		},
		{
			name: 'sensitive field correctly masked',
			code: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			name: 'masked field with a sensitive marker is left alone even when its name contains a non-sensitive substring',
			code: createCredentialCode([
				// 'androidToken' contains the non-sensitive substring 'id' but is a real secret
				createProperty('Android Token', 'androidToken', { password: true }),
				createProperty('Token URL', 'tokenUrl', { password: true }),
			]),
		},
		{
			name: 'class does not implement ICredentialType',
			code: createRegularClass(),
		},
	],
	invalid: [
		{
			name: 'region field should not use password option',
			code: createCredentialCode([createProperty('Region', 'region', { password: true })]),
			errors: [{ messageId: 'unnecessaryPasswordOption', data: { fieldName: 'region' } }],
		},
		{
			name: 'URL field should not use password option',
			code: createCredentialCode([createProperty('Base URL', 'baseUrl', { password: true })]),
			errors: [{ messageId: 'unnecessaryPasswordOption', data: { fieldName: 'baseUrl' } }],
		},
		{
			name: 'ID field should not use password option',
			code: createCredentialCode([createProperty('Client ID', 'clientId', { password: true })]),
			errors: [{ messageId: 'unnecessaryPasswordOption', data: { fieldName: 'clientId' } }],
		},
		{
			name: 'multiple non-sensitive masked fields are each flagged',
			code: createCredentialCode([
				createProperty('Region', 'region', { password: true }),
				createProperty('Host', 'host', { password: true }),
			]),
			errors: [
				{ messageId: 'unnecessaryPasswordOption', data: { fieldName: 'region' } },
				{ messageId: 'unnecessaryPasswordOption', data: { fieldName: 'host' } },
			],
		},
	],
});
