import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { VenafiTlsProtectDatacenterApi } from '../VenafiTlsProtectDatacenterApi.credentials';

describe('VenafiTlsProtectDatacenterApi Credential', () => {
	const credential = new VenafiTlsProtectDatacenterApi();

	it('should request an access token from the domain', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ access_token: 'access-token' });
		const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

		const result = await credential.preAuthentication.call(helper, {
			domain: 'https://venafi.example.com',
			clientId: 'client-id',
			username: 'user',
			password: 'secret',
			scope: 'certificate:manage',
			allowUnauthorizedCerts: true,
		});

		const [options] = httpRequest.mock.calls[0] as [IHttpRequestOptions];
		expect(String(options.url)).toBe('https://venafi.example.com/vedauth/authorize/oauth');
		expect(options.method).toBe('POST');
		expect(options.skipSslCertificateValidation).toBe(true);
		expect(options.body).toEqual({
			client_id: 'client-id',
			username: 'user',
			password: 'secret',
			scope: 'certificate:manage',
		});
		expect(result).toEqual({ token: 'access-token' });
	});
});
