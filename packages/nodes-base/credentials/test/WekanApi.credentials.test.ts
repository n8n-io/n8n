import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { WekanApi } from '../WekanApi.credentials';

describe('WekanApi Credential', () => {
	const credential = new WekanApi();

	it.each(['https://wekan.example.com', 'https://wekan.example.com/'])(
		'should log in at %s',
		async (url) => {
			const httpRequest = vi.fn().mockResolvedValue({ token: 'session-token' });
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			const result = await credential.preAuthentication.call(helper, {
				url,
				username: 'user',
				password: 'secret',
			});

			const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
			expect(String(options.url)).toBe('https://wekan.example.com/users/login');
			expect(options.method).toBe('POST');
			expect(options.body).toEqual({ username: 'user', password: 'secret' });
			expect(result).toEqual({ token: 'session-token' });
		},
	);

	it('should reject a URL without a scheme', async () => {
		const httpRequest = vi.fn();
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		await expect(
			credential.preAuthentication.call(helper, { url: 'wekan.example.com' }),
		).rejects.toThrow('Invalid base URL');
		expect(httpRequest).not.toHaveBeenCalled();
	});
});
