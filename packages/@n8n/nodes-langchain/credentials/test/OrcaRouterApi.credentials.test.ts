import { OrcaRouterApi } from '../OrcaRouterApi.credentials';

describe('OrcaRouterApi Credential', () => {
	const orcaRouterApi = new OrcaRouterApi();

	it('should have correct properties', () => {
		expect(orcaRouterApi.name).toBe('orcaRouterApi');
		expect(orcaRouterApi.displayName).toBe('OrcaRouter');
		expect(orcaRouterApi.documentationUrl).toBe('orcarouter');
	});

	it('should expose an API key and a hidden base URL with the correct default', () => {
		const apiKeyProperty = orcaRouterApi.properties.find((p) => p.name === 'apiKey');
		const urlProperty = orcaRouterApi.properties.find((p) => p.name === 'url');

		expect(apiKeyProperty).toMatchObject({
			displayName: 'API Key',
			type: 'string',
			required: true,
			typeOptions: { password: true },
		});
		expect(urlProperty).toMatchObject({
			displayName: 'Base URL',
			type: 'hidden',
			default: 'https://api.orcarouter.ai/v1',
		});
	});

	it('should authenticate via a Bearer Authorization header', () => {
		expect(orcaRouterApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		});
	});

	it('should test credentials against the /models endpoint of the configured base URL', () => {
		expect(orcaRouterApi.test).toEqual({
			request: {
				baseURL: '={{ $credentials.url }}',
				url: '/models',
			},
		});
	});
});
