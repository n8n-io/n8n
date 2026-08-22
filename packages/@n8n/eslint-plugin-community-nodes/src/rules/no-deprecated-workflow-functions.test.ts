import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDeprecatedWorkflowFunctionsRule } from './no-deprecated-workflow-functions.js';

const ruleTester = new RuleTester();

ruleTester.run('no-deprecated-workflow-functions', NoDeprecatedWorkflowFunctionsRule, {
	valid: [
		{
			name: 'using recommended functions and types',
			code: `
import { IHttpRequestOptions } from 'n8n-workflow';

const requestOptions: IHttpRequestOptions = {
	method: 'GET',
	url: 'https://example.com',
};

const response1 = await this.helpers.httpRequest(requestOptions);
const response2 = await this.helpers.httpRequestWithAuthentication.call(this, 'oAuth2Api', {
	method: 'POST',
	url: 'https://api.example.com/data',
});`,
		},
		{
			name: 'functions with similar names should not trigger',
			code: `
import { request } from 'axios';

const result = await this.helpers.requestSomething();
const response = await request('https://api.example.com');
const config = { request: 'some value' };

// Other objects with helpers property should not trigger
const otherObject = {
	helpers: {
		request: () => 'not n8n',
		requestWithAuthentication: () => 'not n8n'
	}
};
const result2 = otherObject.helpers.request();`,
		},
		{
			name: 'types with same name from other modules should not trigger',
			code: `
import { IRequestOptions } from 'some-other-package';

function test(options: IRequestOptions) {
	return options.url;
}`,
		},
		{
			name: 'non-this helpers in a file that does not handle execution contexts',
			code: `
import { SomeApiClient } from 'some-other-package';

function makeRequest(client: SomeApiClient) {
	const { helpers } = client;
	helpers.request('https://example.com');
	return client.helpers.request('https://example.com');
}`,
		},
	],
	invalid: [
		{
			name: 'deprecated request functions',
			code: `
const response1 = await this.helpers.request('https://example.com/1');
const response2 = await this.helpers.requestWithAuthentication.call(this, 'oauth', options);
const response3 = await this.helpers.requestOAuth2.call(this, 'google', options);`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: { functionName: 'request', replacement: 'httpRequest' },
							output: `
const response1 = await this.helpers.httpRequest('https://example.com/1');
const response2 = await this.helpers.requestWithAuthentication.call(this, 'oauth', options);
const response3 = await this.helpers.requestOAuth2.call(this, 'google', options);`,
						},
					],
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: {
						functionName: 'requestWithAuthentication',
						replacement: 'httpRequestWithAuthentication',
					},
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: {
								functionName: 'requestWithAuthentication',
								replacement: 'httpRequestWithAuthentication',
							},
							output: `
const response1 = await this.helpers.request('https://example.com/1');
const response2 = await this.helpers.httpRequestWithAuthentication.call(this, 'oauth', options);
const response3 = await this.helpers.requestOAuth2.call(this, 'google', options);`,
						},
					],
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
							output: `
const response1 = await this.helpers.request('https://example.com/1');
const response2 = await this.helpers.requestWithAuthentication.call(this, 'oauth', options);
const response3 = await this.helpers.httpRequestWithAuthentication.call(this, 'google', options);`,
						},
					],
				},
			],
		},
		{
			name: 'deprecated types',
			code: `
import { IRequestOptions } from 'n8n-workflow';

function makeRequest(options: IRequestOptions): Promise<any> {
	return this.helpers.request(options);
}`,
			errors: [
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
					suggestions: [
						{
							messageId: 'suggestReplaceType',
							data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
							output: `
import { IHttpRequestOptions } from 'n8n-workflow';

function makeRequest(options: IRequestOptions): Promise<any> {
	return this.helpers.request(options);
}`,
						},
					],
				},
				{
					messageId: 'deprecatedType',
					data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
					suggestions: [
						{
							messageId: 'suggestReplaceType',
							data: { typeName: 'IRequestOptions', replacement: 'IHttpRequestOptions' },
							output: `
import { IRequestOptions } from 'n8n-workflow';

function makeRequest(options: IHttpRequestOptions): Promise<any> {
	return this.helpers.request(options);
}`,
						},
					],
				},
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: { functionName: 'request', replacement: 'httpRequest' },
							output: `
import { IRequestOptions } from 'n8n-workflow';

function makeRequest(options: IRequestOptions): Promise<any> {
	return this.helpers.httpRequest(options);
}`,
						},
					],
				},
			],
		},
		{
			name: 'functions without replacement',
			code: `
const result = await this.helpers.copyBinaryFile();
return this.helpers.prepareOutputData([{ json: response }]);`,
			errors: [
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'copyBinaryFile' },
				},
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'prepareOutputData' },
				},
			],
		},
		{
			name: 'execution context passed in as a parameter',
			code: `
import type { IExecuteFunctions } from 'n8n-workflow';

export async function apiRequest(context: IExecuteFunctions, options) {
	return await context.helpers.requestOAuth2.call(context, 'exampleOAuth2Api', options);
}`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: { functionName: 'requestOAuth2', replacement: 'httpRequestWithAuthentication' },
							output: `
import type { IExecuteFunctions } from 'n8n-workflow';

export async function apiRequest(context: IExecuteFunctions, options) {
	return await context.helpers.httpRequestWithAuthentication.call(context, 'exampleOAuth2Api', options);
}`,
						},
					],
				},
			],
		},
		{
			name: 'execution context union type parameter',
			code: `
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

async function loadOptions(ctx: IExecuteFunctions | ILoadOptionsFunctions) {
	return await ctx.helpers.request({ url: 'https://example.com' });
}`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: { functionName: 'request', replacement: 'httpRequest' },
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: { functionName: 'request', replacement: 'httpRequest' },
							output: `
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

async function loadOptions(ctx: IExecuteFunctions | ILoadOptionsFunctions) {
	return await ctx.helpers.httpRequest({ url: 'https://example.com' });
}`,
						},
					],
				},
			],
		},
		{
			name: 'helpers destructured from this',
			code: `
import type { IExecuteFunctions } from 'n8n-workflow';

async function run(this: IExecuteFunctions) {
	const { helpers } = this;
	return await helpers.requestWithAuthentication('exampleApi', options);
}`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: {
						functionName: 'requestWithAuthentication',
						replacement: 'httpRequestWithAuthentication',
					},
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: {
								functionName: 'requestWithAuthentication',
								replacement: 'httpRequestWithAuthentication',
							},
							output: `
import type { IExecuteFunctions } from 'n8n-workflow';

async function run(this: IExecuteFunctions) {
	const { helpers } = this;
	return await helpers.httpRequestWithAuthentication('exampleApi', options);
}`,
						},
					],
				},
			],
		},
		{
			name: 'execution context held in a class field',
			code: `
import type { IExecuteFunctions } from 'n8n-workflow';

class ExampleApi {
	private executeFunctions: IExecuteFunctions;

	async request(options) {
		return await this.executeFunctions.helpers.requestWithAuthentication.call(
			this.executeFunctions,
			'exampleApi',
			options,
		);
	}
}`,
			errors: [
				{
					messageId: 'deprecatedRequestFunction',
					data: {
						functionName: 'requestWithAuthentication',
						replacement: 'httpRequestWithAuthentication',
					},
					suggestions: [
						{
							messageId: 'suggestReplaceFunction',
							data: {
								functionName: 'requestWithAuthentication',
								replacement: 'httpRequestWithAuthentication',
							},
							output: `
import type { IExecuteFunctions } from 'n8n-workflow';

class ExampleApi {
	private executeFunctions: IExecuteFunctions;

	async request(options) {
		return await this.executeFunctions.helpers.httpRequestWithAuthentication.call(
			this.executeFunctions,
			'exampleApi',
			options,
		);
	}
}`,
						},
					],
				},
			],
		},
		{
			name: 'execution context declared as a constructor parameter property',
			code: `
import type { IExecuteFunctions } from 'n8n-workflow';

class ExampleApi {
	constructor(private readonly ctx: IExecuteFunctions) {}

	async run() {
		return await this.ctx.helpers.prepareOutputData([]);
	}
}`,
			errors: [
				{
					messageId: 'deprecatedWithoutReplacement',
					data: { functionName: 'prepareOutputData' },
				},
			],
		},
	],
});
