import { MetabaseApiKeyApi } from '../MetabaseApiKeyApi.credentials';

describe('MetabaseApiKeyApi Credential', () => {
	const metabaseApiKeyApi = new MetabaseApiKeyApi();

	it('should have correct properties', () => {
		expect(metabaseApiKeyApi.name).toBe('metabaseApiKeyApi');
		expect(metabaseApiKeyApi.displayName).toBe('Metabase API (API Key)');
		expect(metabaseApiKeyApi.documentationUrl).toBe('metabase');
		expect(metabaseApiKeyApi.properties.map((property) => property.name)).toEqual([
			'url',
			'apiKey',
		]);
	});

	it('should mask the API key', () => {
		const apiKeyProperty = metabaseApiKeyApi.properties.find(
			(property) => property.name === 'apiKey',
		);

		expect(apiKeyProperty?.typeOptions).toEqual({ password: true });
	});

	it('should send the API key in the X-API-Key header', () => {
		expect(metabaseApiKeyApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					'X-API-Key': '={{$credentials.apiKey}}',
				},
			},
		});
	});

	it('should test the credential against the current user endpoint', () => {
		expect(metabaseApiKeyApi.test.request.baseURL).toBe(
			'={{$credentials.url.replace(new RegExp("/$"), "")}}',
		);
		expect(metabaseApiKeyApi.test.request.url).toBe('/api/user/current');
	});
});
