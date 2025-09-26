import { RuleTester } from '@typescript-eslint/rule-tester';
import { CredentialPasswordFieldRule } from './credential-password-field.js';

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
	options: { password?: boolean; emptyTypeOptions?: boolean } = {},
): string {
	let typeOptionsStr = '';
	if (options.emptyTypeOptions) {
		typeOptionsStr = '\n\t\t\ttypeOptions: {},';
	} else if (options.password !== undefined) {
		typeOptionsStr = `\n\t\t\ttypeOptions: { password: ${options.password} },`;
	}

	return `{
			displayName: '${displayName}',
			name: '${name}',
			type: 'string',
			default: '',${typeOptionsStr}
		}`;
}

function createOAuth2CredentialCode(hasPasswordProtection: boolean = true): string {
	const passwordOptions = hasPasswordProtection ? '\n\t\t\ttypeOptions: { password: true },' : '';

	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GithubOAuth2Api implements ICredentialType {
	name = 'githubOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'GitHub OAuth2 API';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://github.com/login/oauth/access_token',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',${passwordOptions}
		},
	];
}`;
}

// Helper function to create a regular (non-credential) class
function createRegularClass(): string {
	return `
export class RegularClass {
	properties = [
		{
			name: 'password',
			type: 'string',
		},
	];
}`;
}

ruleTester.run('credential-password-field', CredentialPasswordFieldRule, {
	valid: [
		{
			name: 'correct usage with password field having typeOptions.password = true',
			code: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			name: 'field name is not sensitive',
			code: createCredentialCode([createProperty('Base URL', 'baseUrl')]),
		},
		{
			name: 'multiple sensitive fields with correct typeOptions',
			code: createCredentialCode([
				createProperty('Password', 'password', { password: true }),
				createProperty('Secret Token', 'secretToken', { password: true }),
			]),
		},
		{
			name: 'class does not implement ICredentialType',
			code: createRegularClass(),
		},
		{
			name: 'OAuth2 credential with URL fields and proper client secret protection',
			code: createOAuth2CredentialCode(true),
		},
		{
			name: 'public key fields should not be flagged as sensitive',
			code: createCredentialCode([
				createProperty('Public Key', 'publicKey'),
				createProperty('Client ID', 'clientId'),
			]),
		},
		{
			name: 'certificates should be flagged as sensitive (when properly configured)',
			code: createCredentialCode([
				createProperty('Certificate', 'certificate', { password: true }),
				createProperty('CA Certificate', 'caCert', { password: true }),
				createProperty('Client Certificate', 'clientCert', { password: true }),
			]),
		},
		{
			name: 'URL fields containing sensitive keywords should not be flagged',
			code: createCredentialCode([
				createProperty('Token URL', 'tokenUrl'),
				createProperty('Authorization URL', 'authorizationUrl'),
				createProperty('Access Token URL', 'accessTokenUrl'),
			]),
		},
		{
			name: 'ID fields containing sensitive keywords should not be flagged',
			code: createCredentialCode([
				createProperty('Access Key ID', 'accessKeyId'),
				createProperty('Key ID', 'keyId'),
				createProperty('User ID', 'userId'),
			]),
		},
		{
			name: 'file path and name fields should not be flagged',
			code: createCredentialCode([
				createProperty('Key File Path', 'keyPath'),
				createProperty('Key File Name', 'keyFile'),
				createProperty('Certificate Path', 'keyName'),
			]),
		},
		{
			name: 'should flag actual sensitive fields while ignoring false positives',
			code: createCredentialCode([
				createProperty('Private Key', 'privateKey', { password: true }),
				createProperty('Public Key', 'publicKey'), // Should not be flagged
				createProperty('Secret Token', 'secretToken', { password: true }),
				createProperty('Client ID', 'clientId'), // Should not be flagged
			]),
		},
	],
	invalid: [
		{
			name: 'password field missing typeOptions.password = true',
			code: createCredentialCode([createProperty('Password', 'password')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'password' } }],
			output: createCredentialCode([createProperty('Password', 'password', { password: true })]),
		},
		{
			name: 'API key field missing typeOptions.password = true',
			code: createCredentialCode([createProperty('API Key', 'apiKey')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'apiKey' } }],
			output: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			name: 'secret field missing typeOptions.password = true',
			code: createCredentialCode([createProperty('Client Secret', 'clientSecret')]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'clientSecret' } }],
			output: createCredentialCode([
				createProperty('Client Secret', 'clientSecret', { password: true }),
			]),
		},
		{
			name: 'multiple invalid fields',
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
			name: 'field has typeOptions but password is false',
			code: createCredentialCode([createProperty('API Key', 'apiKey', { password: false })]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'apiKey' } }],
			output: createCredentialCode([createProperty('API Key', 'apiKey', { password: true })]),
		},
		{
			name: 'OAuth2 credential with missing password protection for clientSecret',
			code: createOAuth2CredentialCode(false),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'clientSecret' } }],
			output: createOAuth2CredentialCode(true),
		},
		{
			name: 'field has empty typeOptions object',
			code: createCredentialCode([
				createProperty('Access Token', 'accessToken', { emptyTypeOptions: true }),
			]),
			errors: [{ messageId: 'missingPasswordOption', data: { fieldName: 'accessToken' } }],
			output: createCredentialCode([
				createProperty('Access Token', 'accessToken', { password: true }),
			]),
		},
		{
			name: 'certificate fields should require password protection',
			code: createCredentialCode([
				createProperty('Certificate', 'certificate'),
				createProperty('Client Certificate', 'clientCert'),
			]),
			errors: [
				{ messageId: 'missingPasswordOption', data: { fieldName: 'certificate' } },
				{ messageId: 'missingPasswordOption', data: { fieldName: 'clientCert' } },
			],
			output: createCredentialCode([
				createProperty('Certificate', 'certificate', { password: true }),
				createProperty('Client Certificate', 'clientCert', { password: true }),
			]),
		},
	],
});
