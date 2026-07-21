import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { NotionApi } from '../NotionApi.credentials';

describe('NotionApi Credential', () => {
	const notionApi = new NotionApi();

	it('should have correct properties', () => {
		expect(notionApi.name).toBe('notionApi');
		expect(notionApi.displayName).toBe('Notion API');
		expect(notionApi.documentationUrl).toBe('notion');
		expect(notionApi.properties).toHaveLength(1);
		expect(notionApi.test.request.baseURL).toBe('https://api.notion.com/v1');
		expect(notionApi.test.request.url).toBe('/users/me');
	});

	describe('authenticate', () => {
		it('should add Authorization header and default Notion-Version', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'Notion-Version': '2022-02-22',
			});
		});

		it('should not override existing Notion-Version header (case-sensitive)', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'Notion-Version': '2021-08-16',
				},
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'Notion-Version': '2021-08-16',
			});
		});

		it('should not override existing notion-version header (lowercase)', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'notion-version': '2021-08-16',
				},
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'notion-version': '2021-08-16',
			});
		});

		it('should not override existing Notion-Version header (mixed case)', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'notion-Version': '2021-08-16',
				},
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'notion-Version': '2021-08-16',
			});
		});

		it('should preserve existing headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'X-Custom-Header': 'custom-value',
					'notion-version': '2021-08-16',
				},
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'X-Custom-Header': 'custom-value',
				'notion-version': '2021-08-16',
			});
		});

		it('should handle undefined headers object', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'secret_test123456789',
			};

			const requestOptions: IHttpRequestOptions = {
				url: '/users/me',
				baseURL: 'https://api.notion.com/v1',
			};

			const result = await notionApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: 'Bearer secret_test123456789',
				'Notion-Version': '2022-02-22',
			});
		});
	});
});
