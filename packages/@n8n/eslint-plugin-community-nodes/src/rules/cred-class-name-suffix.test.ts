import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredClassNameSuffixRule } from './cred-class-name-suffix.js';

const ruleTester = new RuleTester();

const credFilePath = '/tmp/TestCredential.credentials.ts';
const nonCredFilePath = '/tmp/SomeHelper.ts';

function createCredentialCode(className: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ${className} implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	properties: INodeProperties[] = [];
}`;
}

function createRegularClass(className: string): string {
	return `
export class ${className} {
	name = 'test';
}`;
}

ruleTester.run('cred-class-name-suffix', CredClassNameSuffixRule, {
	valid: [
		{
			name: 'credential class with Api suffix',
			filename: credFilePath,
			code: createCredentialCode('TestApi'),
		},
		{
			name: 'credential class with OAuth2Api suffix',
			filename: credFilePath,
			code: createCredentialCode('TestOAuth2Api'),
		},
		{
			name: 'class not implementing ICredentialType is ignored',
			filename: credFilePath,
			code: createRegularClass('SomeHelper'),
		},
		{
			name: 'non-.credentials.ts file is ignored',
			filename: nonCredFilePath,
			code: createCredentialCode('TestCredential'),
		},
	],
	invalid: [
		{
			name: 'credential class missing Api suffix',
			filename: credFilePath,
			code: createCredentialCode('TestCredential'),
			errors: [{ messageId: 'missingSuffix', data: { name: 'TestCredential' } }],
			output: createCredentialCode('TestCredentialApi'),
		},
		{
			name: 'credential class name ending in Ap',
			filename: credFilePath,
			code: createCredentialCode('TestAp'),
			errors: [{ messageId: 'missingSuffix', data: { name: 'TestAp' } }],
			output: createCredentialCode('TestApi'),
		},
		{
			name: 'credential class name ending in A',
			filename: credFilePath,
			code: createCredentialCode('TestA'),
			errors: [{ messageId: 'missingSuffix', data: { name: 'TestA' } }],
			output: createCredentialCode('TestApi'),
		},
	],
});
