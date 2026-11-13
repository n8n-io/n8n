import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { CiscoUmbrellaApi } from '../CiscoUmbrellaApi.credentials';

describe('CiscoUmbrellaApi Credential', () => {
	const credential = new CiscoUmbrellaApi();

	it('should request an access token with the client credentials grant', async () => {
		const httpRequest = jest.fn().mockResolvedValue({ access_token: 'access-token' });
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		const result = await credential.preAuthentication.call(helper, {
			apiKey: 'api-key',
			secret: 'api-secret',
		});

		const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
		const url = new URL(String(options.url));
		for (const [key, value] of Object.entries(options.qs ?? {})) {
			url.searchParams.append(key, String(value));
		}
		expect(options.qs).toEqual({ grant_type: 'client_credentials' });
		expect(url.href).toBe('https://api.umbrella.com/auth/v2/token?grant_type=client_credentials');
		expect(options.method).toBe('POST');
		expect(options.auth).toEqual({ username: 'api-key', password: 'api-secret' });
		expect(options.headers).toEqual({ 'Content-Type': 'x-www-form-urlencoded' });
		expect(result).toEqual({ sessionToken: 'access-token' });
	});
});
