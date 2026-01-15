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
});
