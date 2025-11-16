import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { OpenAiApi } from '../OpenAiApi.credentials';

describe('OpenAiApi Credential', () => {
	const openAiApi = new OpenAiApi();

	it('should have correct properties', () => {
		expect(openAiApi.name).toBe('openAiApi');
		expect(openAiApi.displayName).toBe('OpenAi');
		expect(openAiApi.documentationUrl).toBe('openai');
		expect(openAiApi.properties).toHaveLength(4); // apiKey, organizationId, url, customHeaders
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

		it('should preserve existing headers when adding auth headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
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
				Authorization: 'Bearer sk-test123456789',
			});
		});

		it('should preserve existing headers even with custom header option enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
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
				Authorization: 'Bearer sk-test123456789',
				'X-Additional-Header': 'additional-value',
			});
		});

		it('should add multiple custom headers using customHeaders field (JSON string)', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: '{"X-Client-ID": "client-123", "X-Secret-ID": "secret-456"}',
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
				'X-Client-ID': 'client-123',
				'X-Secret-ID': 'secret-456',
			});
		});

		it('should add multiple custom headers using customHeaders field (object)', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: {
					'X-Client-ID': 'client-123',
					'X-Secret-ID': 'secret-456',
				},
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
				'X-Client-ID': 'client-123',
				'X-Secret-ID': 'secret-456',
			});
		});

		it('should handle both legacy header and new customHeaders together', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				header: true,
				headerName: 'X-Legacy-Header',
				headerValue: 'legacy-value',
				customHeaders: '{"X-Client-ID": "client-123", "X-Secret-ID": "secret-456"}',
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
				'X-Legacy-Header': 'legacy-value',
				'X-Client-ID': 'client-123',
				'X-Secret-ID': 'secret-456',
			});
		});

		it('should handle legacy fixedCollection format for backward compatibility', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: {
					headers: [
						{ name: 'X-Client-ID', value: 'client-123' },
						{ name: 'X-Secret-ID', value: 'secret-456' },
					],
				},
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
				'X-Client-ID': 'client-123',
				'X-Secret-ID': 'secret-456',
			});
		});

		it('should handle empty customHeaders JSON', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: '{}',
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

		it('should ignore invalid JSON in customHeaders', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: 'invalid json{',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/models',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			// Should not throw, just ignore invalid JSON
			expect(result.headers).toEqual({
				Authorization: 'Bearer sk-test123456789',
				'OpenAI-Organization': undefined,
			});
		});

		it('should handle customHeaders with organization ID', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				organizationId: 'org-123',
				customHeaders: '{"X-Client-ID": "client-123", "X-Secret-ID": "secret-456"}',
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
				'X-Client-ID': 'client-123',
				'X-Secret-ID': 'secret-456',
			});
		});

		it('should preserve existing headers when using customHeaders', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-test123456789',
				customHeaders: '{"X-Client-ID": "client-123"}',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'OpenAI-Beta': 'assistants=v2',
					'X-Existing-Header': 'existing-value',
				},
				url: '/assistants',
				baseURL: 'https://api.openai.com/v1',
			};

			const result = await openAiApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'OpenAI-Beta': 'assistants=v2',
				'X-Existing-Header': 'existing-value',
				Authorization: 'Bearer sk-test123456789',
				'X-Client-ID': 'client-123',
			});
		});
	});
});
