import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassOAuth2NamingRule } from './cred-class-oauth2-naming.js';

const ruleTester = new RuleTester();

const credFilePath = '/tmp/TestCredential.credentials.ts';
const nonCredFilePath = '/tmp/SomeHelper.ts';

type CredentialFields = {
	className: string;
	name?: string;
	displayName?: string;
	extendsValues?: string[];
	superClass?: string;
};

function createCredentialCode(fields: CredentialFields): string {
	const { className, name, displayName, extendsValues, superClass } = fields;

	const heritage = superClass ? ` extends ${superClass}` : '';
	const lines: string[] = [];
	if (name !== undefined) lines.push(`\tname = '${name}';`);
	if (displayName !== undefined) lines.push(`\tdisplayName = '${displayName}';`);
	if (extendsValues !== undefined) {
		const arr = extendsValues.map((v) => `'${v}'`).join(', ');
		lines.push(`\textends = [${arr}];`);
	}
	lines.push('\tproperties: INodeProperties[] = [];');

	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ${className}${heritage} implements ICredentialType {
${lines.join('\n')}
}`;
}

function createRegularClass(): string {
	return `
export class SomeHelper {
	name = 'helper';
}`;
}

ruleTester.run('cred-class-oauth2-naming', CredClassOAuth2NamingRule, {
	valid: [
		{
			name: 'non-OAuth2 credential is ignored',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleApi',
				name: 'googleApi',
				displayName: 'Google API',
			}),
		},
		{
			name: 'OAuth2 credential with all naming correct',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
		},
		{
			name: 'OAuth2 credential detected via extends array, all naming correct',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				extendsValues: ['oAuth2Api'],
			}),
		},
		{
			name: 'OAuth2 credential detected via TS superClass, all naming correct',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				superClass: 'OAuth2Api',
			}),
		},
		{
			name: 'class not implementing ICredentialType is ignored',
			filename: credFilePath,
			code: createRegularClass(),
		},
		{
			name: 'non-.credentials.ts file is ignored',
			filename: nonCredFilePath,
			code: createCredentialCode({
				className: 'GoogleApi',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
		},
	],
	invalid: [
		{
			name: 'class name missing OAuth2 (detected via name field), with Api suffix',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleApi',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
			errors: [{ messageId: 'classNameMissingOAuth2', data: { name: 'GoogleApi' } }],
			output: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
		},
		{
			name: 'class name missing OAuth2 (detected via displayName), no Api suffix',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'Google',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
			errors: [{ messageId: 'classNameMissingOAuth2', data: { name: 'Google' } }],
			output: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
			}),
		},
		{
			name: 'name field missing OAuth2 (detected via class name)',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleApi',
				displayName: 'Google OAuth2 API',
			}),
			errors: [{ messageId: 'nameMissingOAuth2', data: { value: 'googleApi' } }],
			output: null,
		},
		{
			name: 'displayName missing OAuth2 (detected via class name)',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleOAuth2Api',
				displayName: 'Google API',
			}),
			errors: [{ messageId: 'displayNameMissingOAuth2', data: { value: 'Google API' } }],
			output: null,
		},
		{
			name: 'all three missing OAuth2, detected via extends array',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleApi',
				name: 'googleApi',
				displayName: 'Google API',
				extendsValues: ['oAuth2Api'],
			}),
			errors: [
				{ messageId: 'classNameMissingOAuth2', data: { name: 'GoogleApi' } },
				{ messageId: 'nameMissingOAuth2', data: { value: 'googleApi' } },
				{ messageId: 'displayNameMissingOAuth2', data: { value: 'Google API' } },
			],
			output: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleApi',
				displayName: 'Google API',
				extendsValues: ['oAuth2Api'],
			}),
		},
		{
			name: 'all three missing OAuth2, detected via TS superClass extends',
			filename: credFilePath,
			code: createCredentialCode({
				className: 'GoogleApi',
				name: 'googleApi',
				displayName: 'Google API',
				superClass: 'OAuth2Api',
			}),
			errors: [
				{ messageId: 'classNameMissingOAuth2', data: { name: 'GoogleApi' } },
				{ messageId: 'nameMissingOAuth2', data: { value: 'googleApi' } },
				{ messageId: 'displayNameMissingOAuth2', data: { value: 'Google API' } },
			],
			output: createCredentialCode({
				className: 'GoogleOAuth2Api',
				name: 'googleApi',
				displayName: 'Google API',
				superClass: 'OAuth2Api',
			}),
		},
	],
});
