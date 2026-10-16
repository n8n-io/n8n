import type { IAuthenticateGeneric } from 'n8n-workflow';

import { FreshserviceApi } from '../FreshserviceApi.credentials';

describe('FreshserviceApi Credential', () => {
	const freshserviceApi = new FreshserviceApi();

	it('should have correct metadata and properties', () => {
		expect(freshserviceApi.name).toBe('freshserviceApi');
		expect(freshserviceApi.displayName).toBe('Freshservice API');
		expect(freshserviceApi.documentationUrl).toBe('freshservice');
		expect(freshserviceApi.properties).toHaveLength(2);
		expect(freshserviceApi.properties[0].name).toBe('apiKey');
		expect(freshserviceApi.properties[0].typeOptions).toEqual({ password: true });
		expect(freshserviceApi.properties[1].name).toBe('domain');
	});

	it('should have correct test request configuration', () => {
		expect(freshserviceApi.test.request.baseURL).toBe(
			'=https://{{$credentials.domain}}.freshservice.com/api/v2',
		);
		expect(freshserviceApi.test.request.url).toBe('/agents/me');
	});

	describe('authenticate', () => {
		it('should be configured for basic auth with apiKey as username and X as password', () => {
			const auth = freshserviceApi.authenticate as IAuthenticateGeneric;

			expect(auth.type).toBe('generic');
			expect(auth.properties.auth).toBeDefined();
			expect(auth.properties.auth?.username).toBe('={{$credentials.apiKey}}');
			expect(auth.properties.auth?.password).toBe('X');
		});
	});
});
