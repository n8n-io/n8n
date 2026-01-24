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

	describe('authenticate - Backwards Compatibility', () => {
		it('should use Basic Auth for legacy credentials with username/password but no authType', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				// Legacy credential format (no authType field)
				username: 'legacy-user',
				password: 'legacy-pass',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			const result = await elasticsearchApi.authenticate(credentials, requestOptions);

			// Should use Basic Auth for backwards compatibility
			expect(result.auth?.username).toBe('legacy-user');
			expect(result.auth?.password).toBe('legacy-pass');
			expect(result.headers?.Authorization).toBeUndefined();
		});

		it('should use API Key when authType is not specified but apiKey exists', async () => {
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

			// Should use API Key authentication
			expect(result.headers?.Authorization).toBe('ApiKey default-key');
			expect(result.auth).toBeUndefined();
		});

		it('should throw error when authType is invalid and no valid credentials exist', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'invalid' as any,
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
				// No apiKey, username, or password
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			await expect(elasticsearchApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'Authentication credentials missing',
			);
		});
	});

	describe('authenticate - Validation', () => {
		it('should throw error when API Key is missing for API Key auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'apiKey',
				// apiKey intentionally missing
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			await expect(elasticsearchApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'API Key is required for API Key authentication',
			);
		});

		it('should throw error when username is missing for Basic Auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'basicAuth',
				// username missing
				password: 'testpass',
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			await expect(elasticsearchApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'Username and password are required for Basic Auth',
			);
		});

		it('should throw error when password is missing for Basic Auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'basicAuth',
				username: 'testuser',
				// password missing
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			await expect(elasticsearchApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'Username and password are required for Basic Auth',
			);
		});

		it('should throw error when both username and password are missing for Basic Auth', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				authType: 'basicAuth',
				// username and password both missing
				baseUrl: 'https://test.es.io:9243',
				ignoreSSLIssues: false,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://test.es.io:9243/test',
				method: 'GET',
			};

			await expect(elasticsearchApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'Username and password are required for Basic Auth',
			);
		});
	});
});
