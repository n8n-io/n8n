import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { SchemaRegistryApi } from '../SchemaRegistryApi.credentials';

describe('SchemaRegistryApi Credential', () => {
	const credential = new SchemaRegistryApi();

	it('should test the credential against the subjects endpoint', () => {
		expect(credential.name).toBe('schemaRegistryApi');
		expect(credential.displayName).toBe('Schema Registry');
		expect(credential.test.request).toEqual({
			baseURL: '={{$credentials.url}}',
			url: '/subjects',
		});
	});

	describe('authenticate', () => {
		it('should set the Basic Authorization header and preserve existing headers for basicAuth', async () => {
			const requestOptions: IHttpRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: 'registry-user',
					password: 'registry-password',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
				Authorization: `Basic ${Buffer.from('registry-user:registry-password').toString('base64')}`,
			});
		});

		it('should set the Authorization header when no headers exist for basicAuth', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: 'registry-user',
					password: 'registry-password',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result.headers).toEqual({
				Authorization: `Basic ${Buffer.from('registry-user:registry-password').toString('base64')}`,
			});
		});

		it('should leave the request untouched when authentication is none', async () => {
			const requestOptions: IHttpRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'none',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
			});
			expect(result.headers).not.toHaveProperty('Authorization');
		});
	});
});
