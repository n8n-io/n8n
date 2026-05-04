import { DeepLApi } from '../DeepLApi.credentials';

describe('DeepLApi Credential', () => {
	const deepLApi = new DeepLApi();

	it('should have correct properties', () => {
		expect(deepLApi.name).toBe('deepLApi');
		expect(deepLApi.displayName).toBe('DeepL API');
		expect(deepLApi.documentationUrl).toBe('deepl');
		expect(deepLApi.properties).toHaveLength(2);
	});

	it('should authenticate via Authorization header', () => {
		expect(deepLApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=DeepL-Auth-Key {{$credentials.apiKey}}',
				},
			},
		});
	});

	it('should not use query string authentication', () => {
		const auth = deepLApi.authenticate;
		if ('properties' in auth) {
			expect(auth.properties).not.toHaveProperty('qs');
		}
	});

	it('should test against /usage endpoint', () => {
		expect(deepLApi.test.request.url).toBe('/usage');
	});

	it('should use pro API endpoint for pro plan', () => {
		expect(deepLApi.test.request.baseURL).toContain('api.deepl.com');
	});

	it('should support free and pro API plans', () => {
		const apiPlanProp = deepLApi.properties.find((p) => p.name === 'apiPlan');
		expect(apiPlanProp).toBeDefined();
		expect(apiPlanProp?.type).toBe('options');
		if (apiPlanProp && 'options' in apiPlanProp && Array.isArray(apiPlanProp.options)) {
			const values = apiPlanProp.options.map((o: { value: string }) => o.value);
			expect(values).toContain('pro');
			expect(values).toContain('free');
		}
	});
});
