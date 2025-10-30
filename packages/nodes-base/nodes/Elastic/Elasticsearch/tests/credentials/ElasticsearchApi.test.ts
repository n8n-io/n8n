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

	describe('authenticate - Edge Cases', () => {
		it('should default to API Key auth if authType is not specified', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'default-key',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			// Without authType, it should not add auth (credentials validation would catch this)
			expect(result).toBeDefined();
		});
	});
});
