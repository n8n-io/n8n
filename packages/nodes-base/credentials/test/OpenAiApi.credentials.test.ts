import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { getOpenAiApiKey, getOpenAiCredentialType, OpenAiApi } from '../OpenAiApi.credentials';
import { OpenAiOAuth2Api } from '../OpenAiOAuth2Api.credentials';

describe('OpenAiApi Credential', () => {
	const openAiApi = new OpenAiApi();

	it('should have correct properties', () => {
		expect(openAiApi.name).toBe('openAiApi');
		expect(openAiApi.displayName).toBe('OpenAI');
		expect(openAiApi.documentationUrl).toBe('openai');
		expect(openAiApi.properties).toHaveLength(6);
		expect(openAiApi.properties[0]).toEqual(
			expect.objectContaining({
				name: 'apiKey',
				type: 'string',
			}),
		);
		expect(openAiApi.test.request.baseURL).toBe('={{$credentials?.url}}');
		expect(openAiApi.test.request.url).toBe('/models');
	});

	describe('getOpenAiApiKey', () => {
		it('should prefer the API key when present', () => {
			expect(
				getOpenAiApiKey({
					apiKey: 'test-openai-api-key',
				}),
			).toBe('test-openai-api-key');
		});

		it('should prefer the API key over OAuth token data when both are present', () => {
			expect(
				getOpenAiApiKey({
					apiKey: 'test-openai-api-key',
					oauthTokenData: {
						access_token: 'oauth-token-data',
					},
				}),
			).toBe('test-openai-api-key');
		});

		it('should return token data from OpenAI OAuth credentials', () => {
			expect(
				getOpenAiApiKey({
					oauthTokenData: {
						access_token: 'oauth-token-data',
					},
				}),
			).toBe('oauth-token-data');
		});
	});

	describe('getOpenAiCredentialType', () => {
		it('should return the API key credential type by default', () => {
			expect(getOpenAiCredentialType(undefined)).toBe('openAiApi');
			expect(getOpenAiCredentialType('apiKey')).toBe('openAiApi');
		});

		it('should return the OAuth2 credential type for OAuth2 authentication', () => {
			expect(getOpenAiCredentialType('oAuth2')).toBe('openAiOAuth2Api');
		});
	});

	describe('authenticate', () => {
		it('should add Authorization header with API key only', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer test-openai-api-key',
				'OpenAI-Organization': undefined,
			});
		});

		it('should add Authorization and Organization headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				organizationId: 'org-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer test-openai-api-key',
				'OpenAI-Organization': 'org-123',
			});
		});

		it('should add custom header when header toggle is enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				organizationId: 'org-123',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer test-openai-api-key',
				'OpenAI-Organization': 'org-123',
				'X-Custom-Header': 'custom-value-123',
			});
		});

		it('should not add custom header when header toggle is disabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				header: false,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer test-openai-api-key',
				'OpenAI-Organization': undefined,
			});
			expect(result.headers?.['X-Custom-Header']).toBeUndefined();
		});

		it('should preserve existing headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			const raw =
				typeof (result.headers as any)?.get === 'function'
					? Object.fromEntries((result.headers as unknown as Headers).entries())
					: (result.headers as Record<string, string | undefined>);

			const headers = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));

			expect(headers).toEqual(
				expect.objectContaining({
					authorization: 'Bearer test-openai-api-key',
					'x-custom-header': 'custom-value-123',
					'openai-organization': undefined,
				}),
			);
		});

		it('should handle empty organization ID', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				organizationId: '',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer test-openai-api-key',
				'OpenAI-Organization': '',
			});
		});

		it('should preserve existing headers when adding auth headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'OpenAI-Beta': 'assistants=v2',
				},
				url: '/assistants',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'OpenAI-Beta': 'assistants=v2',
				Authorization: 'Bearer test-openai-api-key',
			});
		});

		it('should preserve existing headers even with custom header option enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-openai-api-key',
				header: true,
				headerName: 'X-Additional-Header',
				headerValue: 'additional-value',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'OpenAI-Beta': 'assistants=v2',
					'X-Existing-Header': 'existing-value',
				},
				url: '/assistants/asst_123',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'OpenAI-Beta': 'assistants=v2',
				'X-Existing-Header': 'existing-value',
				Authorization: 'Bearer test-openai-api-key',
				'X-Additional-Header': 'additional-value',
			});
		});
	});
});

describe('OpenAiOAuth2Api Credential', () => {
	const openAiOAuth2Api = new OpenAiOAuth2Api();

	it('should configure OpenAI device-code OAuth2 with PKCE metadata', () => {
		expect(openAiOAuth2Api.name).toBe('openAiOAuth2Api');
		expect(openAiOAuth2Api.extends).toEqual(['oAuth2Api']);
		expect(openAiOAuth2Api.displayName).toBe('OpenAI Account (ChatGPT)');
		expect(openAiOAuth2Api.icon).toBe('node:n8n-nodes-base.openAi');
		expect(openAiOAuth2Api.__hideOAuthRedirectUrl).toBe(true);
		expect(openAiOAuth2Api.__skipHttpRequestDomainRestrictions).toBe(true);

		expect(openAiOAuth2Api.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'notice',
					type: 'notice',
					displayName:
						'Use this credential to connect your ChatGPT/OpenAI account with device-code login. n8n will save the OAuth token automatically.',
				}),
				expect.objectContaining({ name: 'grantType', type: 'hidden', default: 'pkce' }),
				expect.objectContaining({
					name: 'authUrl',
					type: 'hidden',
					default: 'https://auth.openai.com/oauth/authorize',
				}),
				expect.objectContaining({
					name: 'accessTokenUrl',
					type: 'hidden',
					default: 'https://auth.openai.com/oauth/token',
				}),
				expect.objectContaining({
					name: 'scope',
					type: 'hidden',
					default: 'openid profile email offline_access',
				}),
				expect.objectContaining({ name: 'authentication', type: 'hidden', default: 'body' }),
			]),
		);
		expect(openAiOAuth2Api.properties).toEqual(
			expect.not.arrayContaining([
				expect.objectContaining({ name: 'url' }),
				expect.objectContaining({ name: 'header' }),
				expect.objectContaining({ name: 'organizationId' }),
			]),
		);
	});
});
