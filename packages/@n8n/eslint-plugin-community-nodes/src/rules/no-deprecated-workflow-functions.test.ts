import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';

const ruleTester = new RuleTester();

ruleTester.run('no-deprecated-workflow-functions', NoDeprecatedWorkflowFunctionsRule, {
	valid: [
		{
			// Using recommended httpRequest
			code: `
const response = await this.helpers.httpRequest({
	method: 'GET',
	url: 'https://api.example.com/data',
});`,
		},
		{
			// Using recommended httpRequestWithAuthentication
			code: `
const response = await this.helpers.httpRequestWithAuthentication.call(this, 'oAuth2Api', {
	method: 'POST',
	url: 'https://api.example.com/data',
	body: data,
});`,
		},
		{
			// Using recommended type
			code: `
import { IHttpRequestOptions } from 'n8n-workflow';

const requestOptions: IHttpRequestOptions = {
	method: 'GET',
	url: 'https://example.com',
};`,
		},
		{
			// Non-deprecated function with similar name
			code: `
const result = await this.helpers.requestSomething();`,
		},
		{
			// Property access that's not a function call
			code: `
const config = {
	request: 'some value',
};`,
		},
	],
	invalid: [
		{
			// Deprecated request function
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
			// Deprecated requestWithAuthentication function
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
			// Deprecated requestOAuth1 function
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
			// Deprecated requestOAuth2 function
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
			// Deprecated type in import and type annotation
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
			// Deprecated type in type annotation - only type should be autofixed
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
			// Multiple deprecated functions in same file
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
			// Deprecated function without replacement
			code: `
const result = await this.helpers.copyBinaryFile();`,
			errors: [
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'copyBinaryFile' },
				},
			],
			// No output since there's no replacement
		},
		{
			// Complex case with nested calls - only type should be autofixed
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
			// Import with alias
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
