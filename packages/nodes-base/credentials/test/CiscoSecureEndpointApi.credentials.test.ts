import axios from 'axios';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { CiscoSecureEndpointApi } from '../CiscoSecureEndpointApi.credentials';

jest.mock('axios', () => ({ __esModule: true, default: jest.fn() }));

describe('CiscoSecureEndpointApi Credential', () => {
	const credential = new CiscoSecureEndpointApi();
	const mockedAxios = axios as unknown as jest.Mock;

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
		mockedAxios.mockReset();
		mockedAxios
			.mockResolvedValueOnce({ data: { access_token: 'secure-x-token' } })
			.mockResolvedValueOnce({ data: { access_token: 'secure-endpoint-token' } });
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('ciscoSecureEndpointApi');
		expect(credential.displayName).toBe('Cisco Secure Endpoint (AMP) API');
	});

	describe('authenticate', () => {
		it('exchanges client credentials for the SecureX token using basic auth', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(mockedAxios).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: 'https://visibility.eu.amp.cisco.com/iroh/oauth2/token',
					method: 'POST',
					auth: { username: 'client-id', password: 'client-secret' },
					data: 'grant_type=client_credentials',
				}),
			);
		});

		it('uses the SecureX token to request the Secure Endpoint access token', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(mockedAxios).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://api.eu.amp.cisco.com/v3/access_tokens',
					method: 'POST',
					data: 'grant_type=client_credentials',
					headers: expect.objectContaining({ Authorization: 'Bearer secure-x-token' }),
				}),
			);
		});

		it('attaches the Secure Endpoint access token to the outgoing request', async () => {
			const result = await credential.authenticate(baseCredentials, requestOptions);

			expect(result.headers?.Authorization).toBe('Bearer secure-endpoint-token');
		});

		it('rejects a region outside the supported list without issuing a request', async () => {
			await expect(
				credential.authenticate({ ...baseCredentials, region: 'not-a-region' }, requestOptions),
			).rejects.toThrow('Unsupported Cisco Secure Endpoint region');

			expect(mockedAxios).not.toHaveBeenCalled();
		});

		it('allows the token requests when the allow-list includes the token host', async () => {
			await credential.authenticate(
				{
					...baseCredentials,
					allowedHttpRequestDomains: 'domains',
					allowedDomains: '*.amp.cisco.com',
				},
				requestOptions,
			);

			expect(mockedAxios).toHaveBeenCalledTimes(2);
		});

		it('refuses a domains restriction with an empty allow-list before issuing a request', async () => {
			await expect(
				credential.authenticate(
					{ ...baseCredentials, allowedHttpRequestDomains: 'domains', allowedDomains: '' },
					requestOptions,
				),
			).rejects.toThrow('No allowed domains specified');

			expect(mockedAxios).not.toHaveBeenCalled();
		});

		it('refuses the token requests when the allow-list excludes the token host', async () => {
			await expect(
				credential.authenticate(
					{
						...baseCredentials,
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.com',
					},
					requestOptions,
				),
			).rejects.toThrow(/Domain not allowed/);

			expect(mockedAxios).not.toHaveBeenCalled();
		});

		it('re-checks redirect targets against the allow-list', async () => {
			await credential.authenticate(
				{
					...baseCredentials,
					allowedHttpRequestDomains: 'domains',
					allowedDomains: '*.amp.cisco.com',
				},
				requestOptions,
			);

			const beforeRedirect = mockedAxios.mock.calls[0][0].beforeRedirect as (r: {
				href: string;
			}) => void;

			expect(() => beforeRedirect({ href: 'https://evil.example.com/steal' })).toThrow(
				/Domain not allowed/,
			);
			expect(() =>
				beforeRedirect({ href: 'https://visibility.eu.amp.cisco.com/next' }),
			).not.toThrow();
		});
	});
});
