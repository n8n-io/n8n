import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { OpenAiApi } from '../OpenAiApi.credentials';

describe('OpenAiApi Credential', () => {
	const openAiApi = new OpenAiApi();

	it('should have correct properties', () => {
		expect(openAiApi.name).toBe('openAiApi');
		expect(openAiApi.displayName).toBe('OpenAi');
		expect(openAiApi.documentationUrl).toBe('openAi');
		expect(openAiApi.properties).toHaveLength(6);
		expect(openAiApi.test.request.baseURL).toBe('={{$credentials?.url}}');
		expect(openAiApi.test.request.url).toBe('/models');
	});

	describe('authenticate', () => {
		it('should add Authorization header with API key only', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': undefined,
			});
		});

		it('should add Authorization and Organization headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				organizationId: 'org-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': 'org-123',
			});
		});

		it('should add custom header when header toggle is enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
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
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': 'org-123',
				'X-Custom-Header': 'custom-value-123',
			});
		});

		it('should not add custom header when header toggle is disabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
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
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': undefined,
			});
			expect(result.headers?.['X-Custom-Header']).toBeUndefined();
		});

		it('should preserve existing headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
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
					authorization: 'Bearer sk-test123456789',
					'x-custom-header': 'custom-value-123',
					'openai-organization': undefined,
				}),
			);
		});

		it('should handle empty organization ID', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				organizationId: '',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': '',
			});
		});
	});
});
