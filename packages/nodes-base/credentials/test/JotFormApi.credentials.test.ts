import { mockDeep } from 'vitest-mock-extended';
import type { ICredentialDataDecryptedObject, IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { jotformApiRequest } from '../../nodes/JotForm/GenericFunctions';
import { JotFormApi } from '../JotFormApi.credentials';

const credential = new JotFormApi();

// Evaluate the shipped `baseURL` expression instead of a copy of its logic, so a
// regression in the normalization fails the table below.
const evaluateBaseUrl = (data: ICredentialDataDecryptedObject) => {
	const expression = String(credential.test.request.baseURL)
		.replace(/^=\{\{/, '')
		.replace(/\}\}$/, '');
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	return new Function('$credentials', `return (${expression});`)(data) as string;
};

// The URL `jotformApiRequest` builds for the same credentials.
const nodeUri = async (data: ICredentialDataDecryptedObject) => {
	const context = mockDeep<IHookFunctions>();
	context.getCredentials.mockResolvedValue(data);
	context.getNode.mockReturnValue({
		name: 'JotForm',
		type: 'n8n-nodes-base.jotFormTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as never);
	context.helpers.request.mockResolvedValue({});

	await jotformApiRequest.call(context, 'GET', requestPath`/user`);

	const [options] = context.helpers.request.mock.calls[0] as [IRequestOptions];
	return String(options.uri);
};

describe('JotFormApi credential test', () => {
	it('should test the endpoint with the API key header', () => {
		expect(credential.test.request.method).toBe('GET');
		expect(credential.test.request.url).toBe('/user');
		expect(credential.test.request.headers).toEqual({ APIKEY: '={{ $credentials.apiKey }}' });
	});

	it.each<[ICredentialDataDecryptedObject, string]>([
		[{}, 'https://api.jotform.com'],
		[{ apiDomain: '' }, 'https://api.jotform.com'],
		[{ apiDomain: '   ' }, 'https://api.jotform.com'],
		[{ apiDomain: 'api.jotform.com' }, 'https://api.jotform.com'],
		[{ apiDomain: 'eu-api.jotform.com' }, 'https://eu-api.jotform.com'],
		[
			{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API' },
			'https://subdomain.jotform.com/API',
		],
		[
			{ apiDomain: 'custom', customApiDomain: 'https://subdomain.jotform.com/API' },
			'https://subdomain.jotform.com/API',
		],
		[
			{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API/' },
			'https://subdomain.jotform.com/API',
		],
		[
			{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com//API' },
			'https://subdomain.jotform.com/API',
		],
		[
			{ apiDomain: 'custom', customApiDomain: '  https://subdomain.jotform.com/API  ' },
			'https://subdomain.jotform.com/API',
		],
	])('should resolve the base URL for %j', (data, expected) => {
		expect(evaluateBaseUrl(data)).toBe(expected);
	});

	it.each<[ICredentialDataDecryptedObject]>([
		[{ apiDomain: 'custom', customApiDomain: '' }],
		[{ apiDomain: 'custom', customApiDomain: '   ' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com@attacker.example' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API?x=1' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API#x' }],
		[{ apiDomain: 'custom', customApiDomain: 'ftp://subdomain.jotform.com/API' }],
	])('should reject the invalid domain %j with no base URL', (data) => {
		// An empty base URL makes the request fail, like getJotFormBaseUrl.
		expect(evaluateBaseUrl(data)).toBe('');
	});

	it.each<[ICredentialDataDecryptedObject]>([
		[{}],
		[{ apiDomain: '' }],
		[{ apiDomain: 'api.jotform.com' }],
		[{ apiDomain: 'eu-api.jotform.com' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API' }],
		[{ apiDomain: 'custom', customApiDomain: 'https://subdomain.jotform.com/API' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API/' }],
		[{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com//API' }],
		[{ apiDomain: 'custom', customApiDomain: '  https://subdomain.jotform.com/API  ' }],
	])('should hit the same URL as the node for %j', async (data) => {
		expect(`${evaluateBaseUrl(data)}/user`).toBe(await nodeUri(data));
	});
});
