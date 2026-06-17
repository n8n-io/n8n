import { RuleTester } from '@typescript-eslint/rule-tester';

import { CredentialTestRequiredRule } from './credential-test-required.js';

const ruleTester = new RuleTester();

// Helper function to create credential class code
function createCredentialCode(options: {
	name?: string;
	displayName?: string;
	hasTest?: boolean;
	extends?: string[];
	extraProperties?: string;
}): string {
	const {
		name = 'myApi',
		displayName = 'My API',
		hasTest = false,
		extends: extendsArray,
		extraProperties = '',
	} = options;

	const imports = hasTest
		? "import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';"
		: "import type { ICredentialType, INodeProperties } from 'n8n-workflow';";

	const extendsStr = extendsArray ? `\n\textends = ${JSON.stringify(extendsArray)};` : '';

	const testProperty = hasTest
		? "\n\n\ttest: ICredentialTestRequest = {\n\t\trequest: {\n\t\t\tbaseURL: 'https://api.example.com',\n\t\t\turl: '/test',\n\t\t},\n\t};"
		: '';

	return `
${imports}

export class ${name.charAt(0).toUpperCase() + name.slice(1)} implements ICredentialType {
	name = '${name}';${extendsStr}
	displayName = '${displayName}';
	properties: INodeProperties[] = [];${testProperty}${extraProperties}
}`;
}

function createNonCredentialClass(className: string = 'SomeOtherClass'): string {
	return `
export class ${className} {
	name = 'notACredential';
}`;
}

ruleTester.run('credential-test-required', CredentialTestRequiredRule, {
	valid: [
		{
			name: 'credential class with test property',
			filename: 'MyApi.credentials.ts',
			code: createCredentialCode({ hasTest: true }),
		},
		{
			name: 'credential class extending oAuth2Api (exempt)',
			filename: 'MyOAuth2Api.credentials.ts',
			code: createCredentialCode({
				name: 'myOAuth2Api',
				displayName: 'My OAuth2 API',
				extends: ['oAuth2Api'],
			}),
		},
		{
			name: 'non-credential class ignored',
			filename: 'MyApi.credentials.ts',
			code: createNonCredentialClass(),
		},
		{
			name: 'non-credential file ignored',
			filename: 'regular-file.ts',
			code: createCredentialCode({}),
		},
	],
	invalid: [
		{
			name: 'credential class missing test property and no testedBy in package',
			filename: 'MyApi.credentials.ts',
			code: createCredentialCode({}),
			errors: [
				{
					messageId: 'missingCredentialTest',
					data: { className: 'MyApi' },
					suggestions: [
						{
							messageId: 'addTemplate',
							output: `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MyApi implements ICredentialType {
	name = 'myApi';
	displayName = 'My API';
	properties: INodeProperties[] = [];

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '={{$credentials.server}}/test', // Replace with actual endpoint
		},
	};
}`,
						},
					],
				},
			],
		},
		{
			name: 'credential class with extends but not oAuth2Api and no testedBy in package',
			filename: 'MyApi.credentials.ts',
			code: createCredentialCode({ extends: ['someOtherApi'] }),
			errors: [
				{
					messageId: 'missingCredentialTest',
					data: { className: 'MyApi' },
					suggestions: [
						{
							messageId: 'addTemplate',
							output: `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MyApi implements ICredentialType {
	name = 'myApi';
	extends = ["someOtherApi"];
	displayName = 'My API';
	properties: INodeProperties[] = [];

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '={{$credentials.server}}/test', // Replace with actual endpoint
		},
	};
}`,
						},
					],
				},
			],
		},
		{
			name: 'credential class with empty extends array and no testedBy in package',
			filename: 'MyApi.credentials.ts',
			code: createCredentialCode({ extends: [] }),
			errors: [
				{
					messageId: 'missingCredentialTest',
					data: { className: 'MyApi' },
					suggestions: [
						{
							messageId: 'addTemplate',
							output: `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MyApi implements ICredentialType {
	name = 'myApi';
	extends = [];
	displayName = 'My API';
	properties: INodeProperties[] = [];

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '={{$credentials.server}}/test', // Replace with actual endpoint
		},
	};
}`,
						},
					],
				},
			],
		},
	],
});
