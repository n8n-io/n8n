import { ChromaCloudApi } from '../ChromaCloudApi.credentials';

describe('ChromaCloudApi Credential', () => {
	const chromaCloudApi = new ChromaCloudApi();

	it('should have correct properties', () => {
		expect(chromaCloudApi.name).toBe('chromaCloudApi');
		expect(chromaCloudApi.displayName).toBe('ChromaDB Cloud');
		expect(chromaCloudApi.documentationUrl).toBe('chroma');
		expect(chromaCloudApi.properties).toHaveLength(4);

		const baseUrlProp = chromaCloudApi.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrlProp).toBeDefined();
		expect(baseUrlProp?.default).toBe('https://api.trychroma.com');
		expect(baseUrlProp?.required).toBe(true);

		expect(chromaCloudApi.test.request.baseURL).toBe('={{$credentials.baseUrl}}');
		expect(chromaCloudApi.test.request.url).toBe('/api/v2');
	});

	it('should have correct authentication', () => {
		expect(chromaCloudApi.authenticate).toBeDefined();
		expect(chromaCloudApi.authenticate.type).toBe('generic');
		expect((chromaCloudApi.authenticate.properties as any).headers).toBeDefined();
		expect((chromaCloudApi.authenticate.properties as any).headers['x-chroma-token']).toBe(
			'={{$credentials.apiKey}}',
		);
	});
	const chromaCloudApi2 = new ChromaCloudApi();
	it('should use changed baseUrl in test request when property is modified', () => {
		const customBaseUrl = 'https://custom.chroma.example.com';

		const baseUrlProp = chromaCloudApi2.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrlProp).toBeDefined();
		baseUrlProp!.default = customBaseUrl;

		expect(baseUrlProp!.default).toBe(customBaseUrl);

		const baseURLExpression = chromaCloudApi2.test.request.baseURL;
		expect(baseURLExpression).toBe('={{$credentials.baseUrl}}');

		const credentials = { baseUrl: baseUrlProp!.default };
		const resolvedBaseURL = baseURLExpression?.replace(
			/=\{\{\$credentials\.(\w+)\}\}/,
			(_, key) => credentials[key as keyof typeof credentials],
		);
		expect(resolvedBaseURL).toBe(customBaseUrl);
	});
});
