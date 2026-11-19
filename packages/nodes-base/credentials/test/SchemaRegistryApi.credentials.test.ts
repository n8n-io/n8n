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
		const helperWith = (response: unknown) => {
			const httpRequest = vi.fn().mockResolvedValue(response);
			return { context: { helpers: { httpRequest } } as never, httpRequest };
		};

		it('mints a token for the OAuth2 method', async () => {
			const { context, httpRequest } = helperWith({ access_token: 'tok' });

			const result = await credential.preAuthentication?.call(context, {
				authentication: 'oAuth2ClientCredentials',
				tokenUrl: 'https://idp.example.com/token',
				clientId: 'id',
				clientSecret: 'secret',
			} satisfies ICredentialDataDecryptedObject);

			expect(result).toEqual({ accessToken: 'tok' });
			expect(String((httpRequest.mock.calls[0][0] as IHttpRequestOptions).url)).toBe(
				'https://idp.example.com/token',
			);
		});

		it('surfaces what the token endpoint said when it refuses the grant', async () => {
			const context = {
				helpers: { httpRequest: vi.fn().mockRejectedValue(new Error('invalid_client')) },
			} as never;

			await expect(
				credential.preAuthentication?.call(context, {
					authentication: 'oAuth2ClientCredentials',
					tokenUrl: 'https://idp.example.com/token',
					clientId: 'id',
					clientSecret: 'wrong',
				} satisfies ICredentialDataDecryptedObject),
			).rejects.toThrow('invalid_client');
		});

		it.each(['basicAuth', 'none'])('mints nothing for the %s method', async (authentication) => {
			const { context, httpRequest } = helperWith({ access_token: 'tok' });

			const result = await credential.preAuthentication?.call(context, {
				authentication,
			} satisfies ICredentialDataDecryptedObject);

			expect(result).toEqual({});
			expect(httpRequest).not.toHaveBeenCalled();
		});
	});
});
