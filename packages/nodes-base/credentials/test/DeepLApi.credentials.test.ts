import { DeepLApi } from '../DeepLApi.credentials';

describe('DeepLApi Credential', () => {
	const deepLApi = new DeepLApi();

	it('should have correct metadata and properties', () => {
		expect(deepLApi.name).toBe('deepLApi');
		expect(deepLApi.displayName).toBe('DeepL API');
		expect(deepLApi.documentationUrl).toBe('deepl');
		expect(deepLApi.properties).toHaveLength(2);
		expect(deepLApi.properties[0].name).toBe('apiKey');
		expect(deepLApi.properties[1].name).toBe('apiPlan');
	});

	it('should have correct test request configuration', () => {
		expect(deepLApi.test.request.url).toBe('/usage');
		expect(deepLApi.test.request.baseURL).toBe(
			'={{$credentials.apiPlan === "pro" ? "https://api.deepl.com/v2" : "https://api-free.deepl.com/v2" }}',
		);
	});

	describe('authenticate', () => {
		it('should be configured for header-based authentication with correct format', () => {
			const auth = deepLApi.authenticate as any;

			expect(auth.type).toBe('generic');
			expect(auth.properties.qs).toBeUndefined();
			expect(auth.properties.headers).toBeDefined();
			expect(auth.properties.headers.Authorization).toBe(
				'={{ "DeepL-Auth-Key " + $credentials.apiKey }}',
			);
		});
	});
});
