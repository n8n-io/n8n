import { RuleTester } from '@typescript-eslint/rule-tester';
import { CredentialTestRequiredRule } from './credential-test-required.js';

const ruleTester = new RuleTester();

ruleTester.run('credential-test-required', CredentialTestRequiredRule, {
	valid: [
		{
			name: 'credential class with test property',
			filename: 'MyApi.credentials.ts',
			code: `
				import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyApi implements ICredentialType {
					name = 'myApi';
					displayName = 'My API';
					properties: INodeProperties[] = [];

					test: ICredentialTestRequest = {
						request: {
							baseURL: 'https://api.example.com',
							url: '/test',
						},
					};
				}
			`,
		},
		{
			name: 'credential class extending oAuth2Api (exempt)',
			filename: 'MyOAuth2Api.credentials.ts',
			code: `
				import type { ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyOAuth2Api implements ICredentialType {
					name = 'myOAuth2Api';
					extends = ['oAuth2Api'];
					displayName = 'My OAuth2 API';
					properties: INodeProperties[] = [];
				}
			`,
		},
		{
			name: 'non-credential class ignored',
			filename: 'MyApi.credentials.ts',
			code: `
				export class SomeOtherClass {
					name = 'notACredential';
				}
			`,
		},
		{
			name: 'non-credential file ignored',
			filename: 'regular-file.ts',
			code: `
				import type { ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyApi implements ICredentialType {
					name = 'myApi';
					displayName = 'My API';
					properties: INodeProperties[] = [];
				}
			`,
		},
	],
	invalid: [
		{
			name: 'credential class missing test property',
			filename: 'MyApi.credentials.ts',
			code: `
				import type { ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyApi implements ICredentialType {
					name = 'myApi';
					displayName = 'My API';
					properties: INodeProperties[] = [];
				}
			`,
			errors: [{ messageId: 'missingCredentialTest', data: { className: 'MyApi' } }],
		},
		{
			name: 'credential class with extends but not oAuth2Api',
			filename: 'MyApi.credentials.ts',
			code: `
				import type { ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyApi implements ICredentialType {
					name = 'myApi';
					extends = ['someOtherApi'];
					displayName = 'My API';
					properties: INodeProperties[] = [];
				}
			`,
			errors: [{ messageId: 'missingCredentialTest', data: { className: 'MyApi' } }],
		},
		{
			name: 'credential class with empty extends array',
			filename: 'MyApi.credentials.ts',
			code: `
				import type { ICredentialType, INodeProperties } from 'n8n-workflow';

				export class MyApi implements ICredentialType {
					name = 'myApi';
					extends = [];
					displayName = 'My API';
					properties: INodeProperties[] = [];
				}
			`,
			errors: [{ messageId: 'missingCredentialTest', data: { className: 'MyApi' } }],
		},
	],
});
