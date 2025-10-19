import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { AnthropicApi } from '../AnthropicApi.credentials';

describe('AnthropicApi Credential', () => {
	const anthropicApi = new AnthropicApi();

	it('should have correct properties', () => {
		expect(anthropicApi.name).toBe('anthropicApi');
		expect(anthropicApi.displayName).toBe('Anthropic');
		expect(anthropicApi.documentationUrl).toBe('anthropic');
		expect(anthropicApi.properties).toHaveLength(5);
		expect(anthropicApi.test.request.baseURL).toBe('={{$credentials?.url}}');
		expect(anthropicApi.test.request.url).toBe('/v1/messages');
	});

	describe('authenticate', () => {
		it('should add x-api-key header with API key only', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'x-api-key': 'sk-ant-test123456789',
			});
		});

		it('should add custom header when header toggle is enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'x-api-key': 'sk-ant-test123456789',
				'X-Custom-Header': 'custom-value-123',
			});
		});

		it('should not add custom header when header toggle is disabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
				header: false,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'x-api-key': 'sk-ant-test123456789',
			});
			expect(result.headers?.['X-Custom-Header']).toBeUndefined();
		});

		it('should preserve existing headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value-123',
			};

			const requestOptions: IHttpRequestOptions = {
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			const raw =
				typeof (result.headers as any)?.get === 'function'
					? Object.fromEntries((result.headers as unknown as Headers).entries())
					: (result.headers as Record<string, string | undefined>);

			const headers = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));

			expect(headers).toEqual(
				expect.objectContaining({
					'x-api-key': 'sk-ant-test123456789',
					'x-custom-header': 'custom-value-123',
				}),
			);
		});

		it('should preserve existing headers when adding auth headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'anthropic-version': '2023-06-01',
				},
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'anthropic-version': '2023-06-01',
				'x-api-key': 'sk-ant-test123456789',
			});
		});

		it('should preserve existing headers even with custom header option enabled', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sk-ant-test123456789',
				header: true,
				headerName: 'X-Additional-Header',
				headerValue: 'additional-value',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'anthropic-version': '2023-06-01',
					'X-Existing-Header': 'existing-value',
				},
				url: '/v1/messages',
				baseURL: 'https://api.anthropic.com',
			};

			const result = await anthropicApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'anthropic-version': '2023-06-01',
				'X-Existing-Header': 'existing-value',
				'x-api-key': 'sk-ant-test123456789',
				'X-Additional-Header': 'additional-value',
			});
		});
	});
});
