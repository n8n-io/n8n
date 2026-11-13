import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { FormIoApi } from '../FormIoApi.credentials';

describe('FormIoApi Credential', () => {
	const credential = new FormIoApi();

	it.each([
		['', 'https://formio.form.io/user/login'],
		['https://forms.example.com', 'https://forms.example.com/user/login'],
	])('should log in with domain "%s"', async (domain, expectedUrl) => {
		const httpRequest = jest.fn().mockResolvedValue({ headers: { 'x-jwt-token': 'jwt-token' } });
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		const result = await credential.preAuthentication.call(helper, {
			domain,
			email: 'user@example.com',
			password: 'secret',
		});

		const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
		expect(String(options.url)).toBe(expectedUrl);
		expect(options.method).toBe('POST');
		expect(options.body).toEqual({ data: { email: 'user@example.com', password: 'secret' } });
		expect(result).toEqual({ token: 'jwt-token' });
	});
});
