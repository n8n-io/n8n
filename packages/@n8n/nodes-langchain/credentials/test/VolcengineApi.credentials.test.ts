import { VolcengineApi } from '../VolcengineApi.credentials';

describe('VolcengineApi Credential', () => {
	const volcengineApi = new VolcengineApi();

	it('should have correct properties', () => {
		expect(volcengineApi.name).toBe('volcengineApi');
		expect(volcengineApi.displayName).toBe('Volcengine Ark');
		expect(volcengineApi.documentationUrl).toBe('volcengine');
		expect(volcengineApi.properties).toHaveLength(2);
		expect(volcengineApi.test.request.baseURL).toBe('={{ $credentials.url }}');
		expect(volcengineApi.test.request.url).toBe('/models');
	});

	it('should have correct authentication configuration', () => {
		expect(volcengineApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		});
	});
});
