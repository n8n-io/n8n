import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { Auth0ManagementApi } from '../Auth0ManagementApi.credentials';

describe('Auth0ManagementApi Credential', () => {
	const credential = new Auth0ManagementApi();

	it.each([
		['acme.eu.auth0.com', 'https://acme.eu.auth0.com/api/v2/'],
		['acme.eu.auth0.com/', 'https://acme.eu.auth0.com//api/v2/'],
	])('should request an access token from %s', async (domain, audience) => {
		const httpRequest = jest.fn().mockResolvedValue({ access_token: 'access-token' });
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		const result = await credential.preAuthentication.call(helper, {
			domain,
			clientId: 'client-id',
			clientSecret: 'client-secret',
		});

		const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
		expect(String(options.url)).toBe('https://acme.eu.auth0.com/oauth/token');
		expect(options.method).toBe('POST');
		expect(options.body).toEqual({
			client_id: 'client-id',
			client_secret: 'client-secret',
			audience,
			grant_type: 'client_credentials',
		});
		expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(result).toEqual({ sessionToken: 'access-token' });
	});

	it('should reject a domain that is not a host name', async () => {
		const httpRequest = jest.fn();
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		await expect(
			credential.preAuthentication.call(helper, {
				domain: 'acme.eu.auth0.com/other?x=',
				clientId: 'client-id',
				clientSecret: 'client-secret',
			}),
		).rejects.toThrow('Invalid host');
		expect(httpRequest).not.toHaveBeenCalled();
	});
});
