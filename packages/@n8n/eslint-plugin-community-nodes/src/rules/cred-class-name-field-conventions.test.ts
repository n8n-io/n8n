import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassNameFieldConventionsRule } from './cred-class-name-field-conventions.js';

const ruleTester = new RuleTester();

const credFilePath = '/tmp/TestCredential.credentials.ts';
const nonCredFilePath = '/tmp/SomeHelper.ts';

function createCredentialCode(name: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestApi implements ICredentialType {
	name = '${name}';
	displayName = 'Test API';
	properties: INodeProperties[] = [];
}`;
}

function createRegularClass(name: string): string {
	return `
export class SomeHelper {
	name = '${name}';
}`;
}

// Embeds the raw literal text (including its quotes) verbatim, so tests can
// exercise names containing quote characters that need escaping.
function createCredentialCodeWithLiteral(literal: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestApi implements ICredentialType {
	name = ${literal};
	displayName = 'Test API';
	properties: INodeProperties[] = [];
}`;
}

ruleTester.run('cred-class-name-field-conventions', CredClassNameFieldConventionsRule, {
	valid: [
		{
			name: 'name field with Api suffix and lowercase first char',
			filename: credFilePath,
			code: createCredentialCode('githubApi'),
		},
		{
			name: 'OAuth2 name field is also valid',
			filename: credFilePath,
			code: createCredentialCode('githubOAuth2Api'),
		},
		{
			name: 'class not implementing ICredentialType is ignored',
			filename: credFilePath,
			code: createRegularClass('Github'),
		},
		{
			name: 'non-.credentials.ts file is ignored',
			filename: nonCredFilePath,
			code: createCredentialCode('Github'),
		},
	],
	invalid: [
		{
			name: 'name field missing Api suffix',
			filename: credFilePath,
			code: createCredentialCode('github'),
			errors: [{ messageId: 'missingSuffix', data: { value: 'github' } }],
			output: createCredentialCode('githubApi'),
		},
		{
			name: 'name field with uppercase first char',
			filename: credFilePath,
			code: createCredentialCode('GithubApi'),
			errors: [{ messageId: 'uppercaseFirstChar', data: { value: 'GithubApi' } }],
			output: createCredentialCode('githubApi'),
		},
		{
			name: 'name field with both uppercase first char and missing suffix',
			filename: credFilePath,
			code: createCredentialCode('Github'),
			errors: [
				{ messageId: 'uppercaseFirstChar', data: { value: 'Github' } },
				{ messageId: 'missingSuffix', data: { value: 'Github' } },
			],
			output: createCredentialCode('githubApi'),
		},
		{
			name: 'name field ending in Ap',
			filename: credFilePath,
			code: createCredentialCode('githubAp'),
			errors: [{ messageId: 'missingSuffix', data: { value: 'githubAp' } }],
			output: createCredentialCode('githubApi'),
		},
		{
			name: 'name field ending in A',
			filename: credFilePath,
			code: createCredentialCode('githubA'),
			errors: [{ messageId: 'missingSuffix', data: { value: 'githubA' } }],
			output: createCredentialCode('githubApi'),
		},
		{
			name: 'autofix escapes single quotes in the name value',
			filename: credFilePath,
			code: createCredentialCodeWithLiteral("'git\\'hub'"),
			errors: [{ messageId: 'missingSuffix', data: { value: "git'hub" } }],
			output: createCredentialCodeWithLiteral("'git\\'hubApi'"),
		},
		{
			name: 'autofix preserves double quotes and escapes them in the name value',
			filename: credFilePath,
			code: createCredentialCodeWithLiteral('"Git\\"hub"'),
			errors: [
				{ messageId: 'uppercaseFirstChar', data: { value: 'Git"hub' } },
				{ messageId: 'missingSuffix', data: { value: 'Git"hub' } },
			],
			output: createCredentialCodeWithLiteral('"git\\"hubApi"'),
		},
	],
});
