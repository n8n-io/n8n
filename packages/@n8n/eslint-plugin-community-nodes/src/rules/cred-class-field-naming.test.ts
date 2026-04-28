import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassFieldNamingRule } from './cred-class-field-naming.js';

const ruleTester = new RuleTester();

function credClass(className: string, name: string, displayName: string): string {
	return `
import type { ICredentialType } from 'n8n-workflow';

export class ${className} implements ICredentialType {
	name = '${name}';
	displayName = '${displayName}';
	properties = [];
}`;
}

function nonCredClass(): string {
	return `
export class SomeHelper {
	doSomething() {}
}`;
}

ruleTester.run('cred-class-field-naming', CredClassFieldNamingRule, {
	valid: [
		{
			name: 'valid credential class with correct name and displayName',
			code: credClass('GithubApi', 'githubApi', 'GitHub API'),
		},
		{
			name: 'valid OAuth2 credential class with OAuth2 in name and displayName',
			code: credClass('GithubOAuth2Api', 'githubOAuth2Api', 'GitHub OAuth2 API'),
		},
		{
			name: 'non-credential class is ignored',
			code: nonCredClass(),
		},
	],
	invalid: [
		{
			name: 'name field missing Api suffix',
			code: credClass('GithubApi', 'github', 'GitHub API'),
			errors: [{ messageId: 'nameUnsuffixed' }],
		},
		{
			name: 'displayName field starts with lowercase',
			code: credClass('GithubApi', 'githubApi', 'github api'),
			errors: [{ messageId: 'displayNameMiscased' }],
		},
		{
			name: 'OAuth2 class but name is missing OAuth2',
			code: credClass('GithubOAuth2Api', 'githubApi', 'GitHub OAuth2 API'),
			errors: [{ messageId: 'nameMissingOAuth2' }],
		},
		{
			name: 'displayName contains Api instead of API',
			code: credClass('GithubApi', 'githubApi', 'GitHub Api'),
			errors: [{ messageId: 'displayNameMissingApi' }],
		},
		{
			name: 'OAuth2 class but displayName is missing OAuth2',
			code: credClass('GithubOAuth2Api', 'githubOAuth2Api', 'GitHub API'),
			errors: [{ messageId: 'displayNameMissingOAuth2' }],
		},
	],
});
