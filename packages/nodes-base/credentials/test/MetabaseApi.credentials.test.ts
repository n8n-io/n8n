import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { MetabaseApi } from '../MetabaseApi.credentials';

describe('MetabaseApi Credential', () => {
	const credential = new MetabaseApi();

	it.each(['https://metabase.example.com', 'https://metabase.example.com/'])(
		'should request a session from %s',
		async (url) => {
			const httpRequest = vi.fn().mockResolvedValue({ id: 'session-id' });
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			const result = await credential.preAuthentication.call(helper, {
				url,
				username: 'user@example.com',
				password: 'secret',
			});

			const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
			expect(String(options.url)).toBe('https://metabase.example.com/api/session');
			expect(options.method).toBe('POST');
			expect(options.body).toEqual({ username: 'user@example.com', password: 'secret' });
			expect(result).toEqual({ sessionToken: 'session-id' });
		},
	);
});
