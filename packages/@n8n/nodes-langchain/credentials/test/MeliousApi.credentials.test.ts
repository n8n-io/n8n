import { MeliousApi } from '../MeliousApi.credentials';

describe('MeliousApi Credential', () => {
	const meliousApi = new MeliousApi();

	it('should have correct properties', () => {
		expect(meliousApi.name).toBe('meliousApi');
		expect(meliousApi.displayName).toBe('Melious');
		expect(meliousApi.documentationUrl).toBe('melious');
		expect(meliousApi.properties).toHaveLength(2);
	});

	it('should mask the API key and mark it required', () => {
		expect(meliousApi.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '',
					typeOptions: expect.objectContaining({ password: true }),
				}),
			]),
		);
	});

	it('should pin the base URL to the Melious API', () => {
		expect(meliousApi.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'url',
					type: 'hidden',
					default: 'https://api.melious.ai/v1',
				}),
			]),
		);
	});

	it('should authenticate with a bearer token', () => {
		expect(meliousApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		});
	});

	it('should test the credential against the models endpoint', () => {
		expect(meliousApi.test.request.baseURL).toBe('={{ $credentials.url }}');
		expect(meliousApi.test.request.url).toBe('/models');
	});
});
