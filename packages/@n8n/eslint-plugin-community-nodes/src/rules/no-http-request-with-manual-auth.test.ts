import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoHttpRequestWithManualAuthRule } from './no-http-request-with-manual-auth.js';

const ruleTester = new RuleTester();

ruleTester.run('no-http-request-with-manual-auth', NoHttpRequestWithManualAuthRule, {
	valid: [
		{
			name: 'httpRequest and getCredentials at module top level (no function scope)',
			code: `
const credentials = await this.getCredentials('myApi');
const result = await this.helpers.httpRequest({ url: 'https://api.example.com' });`,
		},
		{
			name: 'httpRequest without getCredentials (unauthenticated call)',
			code: `
async function makeRequest() {
	return this.helpers.httpRequest({ url: 'https://public.api.com' });
}`,
		},
		{
			name: 'httpRequestWithAuthentication with getCredentials (correct pattern)',
			code: `
async function makeRequest() {
	const credentials = await this.getCredentials('myApi');
	return this.helpers.httpRequestWithAuthentication.call(this, 'myApi', {
		url: 'https://api.example.com',
	});
}`,
		},
		{
			name: 'getCredentials called but no httpRequest in same function',
			code: `
async function loadConfig() {
	const credentials = await this.getCredentials('myApi');
	return credentials.apiKey;
}`,
		},
		{
			name: 'getCredentials in outer function, httpRequest in nested function (separate scopes)',
			code: `
async function execute() {
	const credentials = await this.getCredentials('myApi');
	const makeRequest = async () => {
		return this.helpers.httpRequest({ url: 'https://api.example.com' });
	};
	return makeRequest();
}`,
		},
		{
			name: 'other object with helpers.httpRequest is not flagged',
			code: `
async function test() {
	const credentials = await this.getCredentials('myApi');
	const otherObject = { helpers: { httpRequest: async () => {} } };
	return otherObject.helpers.httpRequest({ url: 'https://example.com' });
}`,
		},
	],
	invalid: [
		{
			name: 'function calls both getCredentials and httpRequest',
			code: `
async function makeRequest() {
	const credentials = await this.getCredentials('myApi');
	const options = {
		headers: { Authorization: \`Bearer \${credentials.apiKey}\` },
		url: 'https://api.example.com',
	};
	return this.helpers.httpRequest(options);
}`,
			errors: [{ messageId: 'useHttpRequestWithAuthentication' }],
		},
		{
			name: 'two httpRequest calls in a function that also calls getCredentials — both flagged',
			code: `
async function makeRequests() {
	const credentials = await this.getCredentials('myApi');
	const r1 = await this.helpers.httpRequest({ url: 'https://api.example.com/a' });
	const r2 = await this.helpers.httpRequest({ url: 'https://api.example.com/b' });
	return [r1, r2];
}`,
			errors: [
				{ messageId: 'useHttpRequestWithAuthentication' },
				{ messageId: 'useHttpRequestWithAuthentication' },
			],
		},
		{
			name: 'class method pattern',
			code: `
class MyNode {
	async execute() {
		const credentials = await this.getCredentials('myApi');
		return this.helpers.httpRequest({
			headers: { Authorization: credentials.apiKey },
			url: 'https://api.example.com',
		});
	}
}`,
			errors: [{ messageId: 'useHttpRequestWithAuthentication' }],
		},
	],
});
