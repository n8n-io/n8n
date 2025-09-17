import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';

const ruleTester = new RuleTester();

ruleTester.run('no-deprecated-workflow-functions', NoDeprecatedWorkflowFunctionsRule, {
	valid: [
		{
			name: 'using recommended httpRequest',
			code: `
const response = await this.helpers.httpRequest({
	method: 'GET',
	url: 'https://api.example.com/data',
});`,
		},
		{
			name: 'using recommended httpRequestWithAuthentication',
			code: `
const response = await this.helpers.httpRequestWithAuthentication.call(this, 'oAuth2Api', {
	method: 'POST',
	url: 'https://api.example.com/data',
	body: data,
});`,
		},
		{
			name: 'using recommended type',
			code: `
import { IHttpRequestOptions } from 'n8n-workflow';

const requestOptions: IHttpRequestOptions = {
	method: 'GET',
	url: 'https://example.com',
};`,
		},
		{
			name: 'non-deprecated function with similar name',
			code: `
const result = await this.helpers.requestSomething();`,
		},
		{
			name: 'property access that is not a function call',
			code: `
const config = {
	request: 'some value',
};`,
		},
	],
	invalid: [
		{
			name: 'deprecated request function',
			code: `
const response = await this.helpers.request('https://api.example.com/data');`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
				},
			],
		},
		{
			name: 'deprecated requestWithAuthentication function',
			code: `
const response = await this.helpers.requestWithAuthentication.call(this, 'oAuth2Api', {
	method: 'POST',
	url: 'https://api.example.com/data',
});`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: {
						functionName: 'requestWithAuthentication',
						replacement: 'httpRequestWithAuthentication',
					},
				},
			],
		},
		{
			name: 'deprecated requestOAuth1 function',
			code: `
const response = await this.helpers.requestOAuth1.call(this, 'twitterOAuth1Api', requestOptions);`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'requestOAuth1', replacement: 'httpRequestWithAuthentication' },
				},
			],
		},
		{
			name: 'deprecated requestOAuth2 function',
			code: `
const response = await this.helpers.requestOAuth2.call(this, 'googleOAuth2Api', requestOptions);`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
				},
			],
		},
		{
			name: 'deprecated type in import and type annotation',
			code: `
import { IRequestOptions } from 'n8n-workflow';

const options: IRequestOptions = {
	url: 'https://example.com',
};`,
			errors: [
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
				},
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
				},
			],
		},
		{
			name: 'deprecated type and function in same code',
			code: `
function makeRequest(options: IRequestOptions): Promise<any> {
	return this.helpers.request(options);
}`,
			errors: [
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
				},
			],
		},
		{
			name: 'multiple deprecated functions in same file',
			code: `
const response1 = await this.helpers.request('https://example.com/1');
const response2 = await this.helpers.requestWithAuthentication.call(this, 'oauth', options);
const response3 = await this.helpers.requestOAuth2.call(this, 'google', options);`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: {
						functionName: 'requestWithAuthentication',
						replacement: 'httpRequestWithAuthentication',
					},
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
				},
			],
		},
		{
			name: 'deprecated function without replacement',
			code: `
const result = await this.helpers.copyBinaryFile();`,
			errors: [
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'copyBinaryFile' },
				},
			],
		},
		{
			name: 'complex case with multiple deprecated items',
			code: `
export class MyNode implements INodeType {
	async execute(): Promise<INodeExecutionData[][]> {
		const requestOptions: IRequestOptions = {
			method: 'GET',
			url: 'https://api.example.com',
		};

		const response = await this.helpers.request(requestOptions);
		return this.helpers.prepareOutputData([{ json: response }]);
	}
}`,
			errors: [
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
				},
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'prepareOutputData' },
				},
			],
		},
		{
			name: 'import with alias',
			code: `
import { IRequestOptions as RequestOpts } from 'n8n-workflow';

function test(opts: RequestOpts) {
	return opts.url;
}`,
			errors: [
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
				},
			],
		},
	],
});
