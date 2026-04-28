import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassNamingRule } from './cred-class-naming.js';

const ruleTester = new RuleTester();

const validCredFilePath = '/tmp/credentials/GithubApi.credentials.ts';
const oauth2CredFilePath = '/tmp/credentials/GithubOAuth2Api.credentials.ts';
const wrongNameCredFilePath = '/tmp/credentials/GithubApi.credentials.ts';
const wrongExtFilePath = '/tmp/credentials/GithubApi.ts';
const kebabFilePath = '/tmp/credentials/github-api.credentials.ts';

function credClass(name: string): string {
	return `
import type { ICredentialType } from 'n8n-workflow';

export class ${name} implements ICredentialType {
	name = 'githubApi';
	displayName = 'GitHub API';
	properties = [];
}`;
}

function nonCredClass(): string {
	return `
export class SomeHelper {
	doSomething() {}
}`;
}

ruleTester.run('cred-class-naming', CredClassNamingRule, {
	valid: [
		{
			name: 'valid credential class name and filename',
			filename: validCredFilePath,
			code: credClass('GithubApi'),
		},
		{
			name: 'valid OAuth2 credential class name and filename',
			filename: oauth2CredFilePath,
			code: credClass('GithubOAuth2Api'),
		},
		{
			name: 'non-credential class is ignored',
			filename: '/tmp/SomeHelper.ts',
			code: nonCredClass(),
		},
	],
	invalid: [
		{
			name: 'credential class not suffixed with Api',
			filename: wrongNameCredFilePath,
			code: credClass('Github'),
			errors: [{ messageId: 'classNameUnsuffixed' }, { messageId: 'filenameAgainstConvention' }],
		},
		{
			name: 'credential class with correct name but kebab-case filename',
			filename: kebabFilePath,
			code: credClass('GithubApi'),
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
		{
			name: 'credential class with correct name but missing .credentials.ts extension',
			filename: wrongExtFilePath,
			code: credClass('GithubApi'),
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
	],
});
