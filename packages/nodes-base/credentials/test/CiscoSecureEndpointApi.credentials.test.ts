import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { CiscoSecureEndpointApi } from '../CiscoSecureEndpointApi.credentials';

describe('CiscoSecureEndpointApi Credential', () => {
	const credential = new CiscoSecureEndpointApi();

	const requestMock = vi.fn();
	const requestsMock = vi.fn(() => ({ request: requestMock }));
	const ssrfService = {} as SsrfProtectionService;
	let ssrfEnabled = false;

	const baseCredentials = {
		region: 'eu.amp',
		clientId: 'client-id',
		clientSecret: 'client-secret',
	};

	const requestOptions: IHttpRequestOptions = {
		headers: {},
		method: 'GET',
		url: 'https://api.eu.amp.cisco.com/v3/organizations',
	};

	beforeEach(() => {
		ssrfEnabled = false;
		requestMock.mockReset();
		requestMock
			.mockResolvedValueOnce({ access_token: 'secure-x-token' })
			.mockResolvedValueOnce({ access_token: 'secure-endpoint-token' });
		requestsMock.mockClear();

		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			if (token === SsrfProtectionConfig) return { enabled: ssrfEnabled };
			if (token === SsrfProtectionService) return ssrfService;
			throw new Error('unexpected DI token');
		});
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('ciscoSecureEndpointApi');
		expect(credential.displayName).toBe('Cisco Secure Endpoint (AMP) API');
	});

	describe('authenticate', () => {
		it('exchanges client credentials for the SecureX token using basic auth', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(requestMock).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: 'https://visibility.eu.amp.cisco.com/iroh/oauth2/token',
					method: 'POST',
					auth: { username: 'client-id', password: 'client-secret' },
					body: 'grant_type=client_credentials',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Accept: 'application/json',
					},
					json: true,
				}),
			);
		});

		it('uses the SecureX token to request the Secure Endpoint access token', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(requestMock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://api.eu.amp.cisco.com/v3/access_tokens',
					method: 'POST',
					body: 'grant_type=client_credentials',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Accept: 'application/json',
						Authorization: 'Bearer secure-x-token',
					},
					json: true,
				}),
			);
		});

		it('disables SSRF protection when it is turned off in config', async () => {
			ssrfEnabled = false;

			await credential.authenticate(baseCredentials, requestOptions);

			expect(requestsMock).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});

		it('enables SSRF protection when it is turned on in config', async () => {
			ssrfEnabled = true;

			await credential.authenticate(baseCredentials, requestOptions);

			expect(requestsMock).toHaveBeenCalledWith({ ssrf: ssrfService });
		});

		it('attaches the Secure Endpoint access token to the outgoing request', async () => {
			const result = await credential.authenticate(baseCredentials, requestOptions);

			expect(result.headers?.Authorization).toBe('Bearer secure-endpoint-token');
		});
	});
});
