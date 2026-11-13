import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { BaserowApi } from '../BaserowApi.credentials';

describe('BaserowApi Credential', () => {
	const credential = new BaserowApi();

	const runPreAuthentication = async (host: string) => {
		const httpRequest = vi.fn().mockResolvedValue({ token: 'jwt-token' });
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;
		const result = await credential.preAuthentication.call(helper, {
			host,
			username: 'user@example.com',
			password: 'secret',
		});
		const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
		return { result, options };
	};

	it.each(['https://api.baserow.io', 'https://baserow.example.com/'])(
		'should request a session token from %s',
		async (host) => {
			const { result, options } = await runPreAuthentication(host);

			expect(String(options.url)).toBe(`${host.replace(/\/$/, '')}/api/user/token-auth/`);
			expect(options.method).toBe('POST');
			expect(options.body).toEqual({ username: 'user@example.com', password: 'secret' });
			expect(result).toEqual({ jwtToken: 'jwt-token' });
		},
	);
});
