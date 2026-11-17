import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { CrowdStrikeOAuth2Api } from '../CrowdStrikeOAuth2Api.credentials';

describe('CrowdStrikeOAuth2Api Credential', () => {
	const credential = new CrowdStrikeOAuth2Api();

	it.each(['https://api.us-2.crowdstrike.com', 'https://api.us-2.crowdstrike.com/'])(
		'should request an access token from %s',
		async (url) => {
			const httpRequest = vi.fn().mockResolvedValue({ access_token: 'access-token' });
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			const result = await credential.preAuthentication.call(helper, {
				url,
				clientId: 'client-id',
				clientSecret: 'client-secret',
			});

			const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
			expect(String(options.url)).toBe('https://api.us-2.crowdstrike.com/oauth2/token');
			expect(options.method).toBe('POST');
			expect(options.body).toEqual({ client_id: 'client-id', client_secret: 'client-secret' });
			expect(options.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
			expect(result).toEqual({ sessionToken: 'access-token' });
		},
	);
});
