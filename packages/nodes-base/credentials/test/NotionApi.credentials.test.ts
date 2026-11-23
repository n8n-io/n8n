import type { IHttpRequestOptions } from 'n8n-workflow';

import { NotionApi } from '../NotionApi.credentials';

describe('NotionApi Credential', () => {
	const credential = new NotionApi();
	const credentials = { apiKey: 'test-notion-token' };

	describe('authenticate', () => {
		it.each(['Notion-Version', 'notion-version', 'NOTION-VERSION', 'nOtIoN-vErSiOn'])(
			'should preserve an explicit %s header without adding another version',
			async (headerName) => {
				// NODE-5671: The HTTP Request node lowercases manual headers by default.
				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: 'https://api.notion.com/v1/search',
					headers: { [headerName]: '2026-03-11' },
				};

				const result = await credential.authenticate(credentials, requestOptions);
				const versions = Object.entries(result.headers ?? {})
					.filter(([name]) => name.toLowerCase() === 'notion-version')
					.map(([, value]) => value);

				expect(versions).toEqual(['2026-03-11']);
			},
		);

		it.each([undefined, {}, { 'Content-Type': 'application/json' }])(
			'should add the default version when headers are %j',
			async (headers) => {
				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: 'https://api.notion.com/v1/search',
					headers,
				};

				const result = await credential.authenticate(credentials, requestOptions);

				expect(result.headers).toEqual({
					...headers,
					Authorization: `Bearer ${credentials.apiKey} `,
					'Notion-Version': '2022-02-22',
				});
			},
		);
	});
});
