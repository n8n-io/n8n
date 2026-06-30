import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredFilenameAgainstConventionRule } from './cred-filename-against-convention.js';

const ruleTester = new RuleTester();

function createCredentialCode(className: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ${className} implements ICredentialType {
	name = '${className.charAt(0).toLowerCase() + className.slice(1)}';
	displayName = '${className}';
	properties: INodeProperties[] = [];
}`;
}

function createRegularClass(): string {
	return `
export class SomeHelper {
	name = 'githubApi';
}`;
}

ruleTester.run('cred-filename-against-convention', CredFilenameAgainstConventionRule, {
	valid: [
		{
			name: 'filename matches credential class name',
			filename: '/tmp/GithubApi.credentials.ts',
			code: createCredentialCode('GithubApi'),
		},
		{
			name: 'multi-word class name matches filename',
			filename: '/tmp/GoogleSheetsOAuth2Api.credentials.ts',
			code: createCredentialCode('GoogleSheetsOAuth2Api'),
		},
		{
			name: 'class not implementing ICredentialType is ignored',
			filename: '/tmp/Github.credentials.ts',
			code: createRegularClass(),
		},
		{
			name: 'non-.credentials.ts file is ignored',
			filename: '/tmp/GithubApi.ts',
			code: createCredentialCode('Mismatch'),
		},
	],
	invalid: [
		{
			name: 'filename does not match class name',
			filename: '/tmp/GithubApi.credentials.ts',
			code: createCredentialCode('GitlabApi'),
			errors: [
				{
					messageId: 'renameFile',
					data: { className: 'GitlabApi', expected: 'GitlabApi.credentials.ts' },
				},
			],
		},
		{
			name: 'filename has wrong casing',
			filename: '/tmp/githubApi.credentials.ts',
			code: createCredentialCode('GithubApi'),
			errors: [
				{
					messageId: 'renameFile',
					data: { className: 'GithubApi', expected: 'GithubApi.credentials.ts' },
				},
			],
		},
	],
});
