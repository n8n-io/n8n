import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { ElasticsearchApi } from '../../../../../credentials/ElasticsearchApi.credentials';

describe('ElasticsearchApi', () => {
	const elasticsearchApi = new ElasticsearchApi();

	describe('authenticate - API Key', () => {
		it('should add Authorization header with ApiKey when using API Key auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'apiKey',
				apiKey: 'test-api-key-123',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			expect(result.headers?.Authorization).toBe('ApiKey test-api-key-123');
			expect(result.auth).toBeUndefined();
		});

		it('should preserve existing headers when adding API Key auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'apiKey',
				apiKey: 'test-api-key-xyz',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			expect(result.headers?.Authorization).toBe('ApiKey test-api-key-xyz');
			expect(result.headers?.['Content-Type']).toBe('application/json');
		});
	});

	describe('authenticate - Basic Auth', () => {
		it('should add basic auth credentials when using Basic Auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'basicAuth',
				username: 'testuser',
				password: 'testpass',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			expect(result.auth?.username).toBe('testuser');
			expect(result.auth?.password).toBe('testpass');
			expect(result.headers?.Authorization).toBeUndefined();
		});

		it('should handle empty request headers when using Basic Auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'basicAuth',
				username: 'admin',
				password: 'secret',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'POST',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			expect(result.auth).toEqual({
				username: 'admin',
				password: 'secret',
			});
		});
	});

	describe('authenticate - Default Behavior', () => {
		it('should default to API Key auth when authType is not specified', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'default-key',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
				// authType intentionally omitted
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			// Should default to API Key authentication
			expect(result.headers?.Authorization).toBe('ApiKey default-key');
			expect(result.auth).toBeUndefined();
		});

		it('should default to API Key auth when authType is invalid', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'invalid' as any,
				apiKey: 'fallback-key',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			// Should fallback to API Key authentication
			expect(result.headers?.Authorization).toBe('ApiKey fallback-key');
			expect(result.auth).toBeUndefined();
		});
	});
});
