import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { SchemaRegistryApi } from '../SchemaRegistryApi.credentials';

describe('SchemaRegistryApi Credential', () => {
	const credential = new SchemaRegistryApi();

	it('should test the credential against the subjects endpoint', () => {
		expect(credential.name).toBe('schemaRegistryApi');
		expect(credential.displayName).toBe('Schema Registry');
		expect(credential.test.request).toEqual({
			baseURL: '={{$credentials.url}}',
			url: '/subjects',
		});
	});

	describe('authenticate', () => {
		it('should set basic auth and preserve existing headers for basicAuth', async () => {
			const requestOptions: IHttpRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: 'registry-user',
					password: 'registry-password',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result.auth).toEqual({
				username: 'registry-user',
				password: 'registry-password',
			});
			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
			});
		});

		it('should not set auth when the basicAuth username is empty', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: '',
					password: 'registry-password',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result).not.toHaveProperty('auth');
		});

		it('should not set auth when the basicAuth password is empty', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: 'registry-user',
					password: '',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result).not.toHaveProperty('auth');
		});

		it('should leave the request untouched when authentication is none', async () => {
			const requestOptions: IHttpRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'none',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result).not.toHaveProperty('auth');
			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
			});
		});

		it('sends the minted token as a bearer on the OAuth2 method', async () => {
			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'oAuth2ClientCredentials',
					accessToken: 'tok',
				} satisfies ICredentialDataDecryptedObject,
				{ url: '/subjects' },
			);

			expect(result.headers).toEqual({ Authorization: 'Bearer tok' });
			expect(result).not.toHaveProperty('auth');
		});
	});

	describe('preAuthentication', () => {
		const requestMock = vi.fn();
		const oauthCredentials = {
			authentication: 'oAuth2ClientCredentials',
			tokenUrl: 'https://idp.example.com/token',
			clientId: 'id',
			clientSecret: 'secret',
		} satisfies ICredentialDataDecryptedObject;

		beforeEach(() => {
			requestMock.mockReset();
			requestMock.mockResolvedValue({ access_token: 'tok' });
			vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
				if (token === OutboundHttp) return { requests: () => ({ request: requestMock }) };
				throw new Error('unexpected DI token');
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('mints a token for the OAuth2 method', async () => {
			const result = await credential.preAuthentication?.(oauthCredentials);

			expect(result).toEqual({ accessToken: 'tok' });
			expect((requestMock.mock.calls[0][0] as { url: string }).url).toBe(
				'https://idp.example.com/token',
			);
		});

		it('names what the token endpoint said when it refuses the grant', async () => {
			requestMock.mockRejectedValue(
				Object.assign(new Error('Request failed with status code 401'), {
					[Symbol.for('n8n.backend-network.http-request-error')]: true,
					response: { status: 401, data: { error_description: 'Client authentication failed' } },
				}),
			);

			await expect(credential.preAuthentication?.(oauthCredentials)).rejects.toThrow(
				'The token endpoint refused the grant: Client authentication failed',
			);
		});

		it.each(['basicAuth', 'none'])('mints nothing for the %s method', async (authentication) => {
			const result = await credential.preAuthentication?.({
				authentication,
			} satisfies ICredentialDataDecryptedObject);

			expect(result).toEqual({});
			expect(requestMock).not.toHaveBeenCalled();
		});
	});
});
