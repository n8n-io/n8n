import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { ZscalerZiaApi } from '../ZscalerZiaApi.credentials';

describe('ZscalerZiaApi Credential', () => {
	const credential = new ZscalerZiaApi();

	it.each(['zsapi.zscalerthree.net', 'zsapi.zscalerthree.net/'])(
		'should request a session from %s',
		async (baseUrl) => {
			const httpRequest = vi.fn().mockResolvedValue({
				headers: { 'set-cookie': ['JSESSIONID=session-id; Path=/; Secure'] },
			});
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			const result = await credential.preAuthentication.call(helper, {
				baseUrl,
				username: 'admin@example.com',
				password: 'secret',
				apiKey: 'abcdefghijkl',
			});

			const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
			expect(String(options.url)).toBe(
				'https://zsapi.zscalerthree.net/api/v1/authenticatedSession',
			);
			expect(options.baseURL).toBeUndefined();
			expect(options.method).toBe('POST');
			expect(options.body).toEqual(
				expect.objectContaining({ username: 'admin@example.com', password: 'secret' }),
			);
			expect(result).toEqual({ cookie: 'JSESSIONID=session-id' });
		},
	);

	it('should reject a base URL that is not a host name', async () => {
		const httpRequest = vi.fn();
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		await expect(
			credential.preAuthentication.call(helper, {
				baseUrl: 'zsapi.zscalerthree.net/other?x=',
				username: 'admin@example.com',
				password: 'secret',
				apiKey: 'abcdefghijkl',
			}),
		).rejects.toThrow('Invalid host');
		expect(httpRequest).not.toHaveBeenCalled();
	});
});
