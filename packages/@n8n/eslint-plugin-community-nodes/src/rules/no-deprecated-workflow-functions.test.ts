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
				},
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
	],
});
