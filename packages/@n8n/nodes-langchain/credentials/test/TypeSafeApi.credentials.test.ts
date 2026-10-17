import { TypeSafeApi } from '../TypeSafeApi.credentials';

describe('TypeSafeApi Credential', () => {
	const typeSafeApi = new TypeSafeApi();

	it('should have correct properties', () => {
		expect(typeSafeApi.name).toBe('typeSafeApi');
		expect(typeSafeApi.displayName).toBe('TypeSafe');
		expect(typeSafeApi.documentationUrl).toBe('typesafe');
		expect(typeSafeApi.properties).toEqual([
			expect.objectContaining({ name: 'apiKey', typeOptions: { password: true }, required: true }),
			expect.objectContaining({ name: 'url', default: 'https://api.typesafe.ai' }),
		]);
	});

	it('should authenticate with a bearer token', () => {
		expect(typeSafeApi.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		});
	});

	it('should test the credential against the non-billable models endpoint', () => {
		expect(typeSafeApi.test.request).toEqual({
			baseURL: '={{$credentials.url}}',
			url: '/v1/models',
			method: 'GET',
		});
	});
});
