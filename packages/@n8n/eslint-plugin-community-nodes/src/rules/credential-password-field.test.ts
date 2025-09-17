import { RuleTester } from '@typescript-eslint/rule-tester';
import { CredentialPasswordFieldRule } from './credential-password-field.js';

const ruleTester = new RuleTester();

// Helper function to create credential class code
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

// Helper to create a property object string
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

ruleTester.run('credential-password-field', CredentialPasswordFieldRule, {
	valid: [
		{
			// Correct usage with password field having typeOptions.password = true
			code: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			// Field name is not sensitive
			code: createCredentialCode([createProperty('Base URL', 'baseUrl')]),
		},
		{
			// Multiple sensitive fields with correct typeOptions
			code: createCredentialCode([
				createProperty('Password', 'password', { password: true }),
				createProperty('Secret Token', 'secretToken', { password: true }),
			]),
		},
		{
			// Class doesn't implement ICredentialType
			code: `
export class RegularClass {
	properties = [
		{
			name: 'password',
			type: 'string',
		},
	];
}`,
		},
	],
	invalid: [
		{
			// Password field missing typeOptions.password = true
			code: createCredentialCode([createProperty('Password', 'password')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'password' } }],
			output: createCredentialCode([createProperty('Password', 'password', { password: true })]),
		},
		{
			// API key field missing typeOptions.password = true
			code: createCredentialCode([createProperty('API Key', 'apiKey')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'apiKey' } }],
			output: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			// Secret field missing typeOptions.password = true
			code: createCredentialCode([createProperty('Client Secret', 'clientSecret')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'clientSecret' } }],
			output: createCredentialCode([
				createProperty('Client Secret', 'clientSecret', { password: true }),
			]),
		},
		{
			// Multiple invalid fields
			code: createCredentialCode([
				createProperty('Password', 'password'),
				createProperty('Username', 'username'),
				createProperty('Access Token', 'accessToken'),
			]),
			errors: [
				{ messageId: 'missingPasswordOption', data: { fieldName: 'password' } },
				{ messageId: 'missingPasswordOption', data: { fieldName: 'accessToken' } },
			],
			output: createCredentialCode([
				createProperty('Password', 'password', { password: true }),
				createProperty('Username', 'username'),
				createProperty('Access Token', 'accessToken', { password: true }),
			]),
		},
		{
			// Field has typeOptions but password is false
			code: createCredentialCode([createProperty('API Key', 'apiKey', { password: false })]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'apiKey' } }],
			output: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
	],
});
