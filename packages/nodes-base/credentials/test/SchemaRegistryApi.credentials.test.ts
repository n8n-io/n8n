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
		it('should set basic auth and preserve existing headers for basicAuth', async () => {
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

			expect(result.auth).toEqual({
				username: 'registry-user',
				password: 'registry-password',
			});
			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
			});
		});

		it('should not set auth when the basicAuth username is empty', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: '',
					password: 'registry-password',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result).not.toHaveProperty('auth');
		});

		it('should not set auth when the basicAuth password is empty', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: '/subjects',
			};

			const result = await credential.authenticate(
				{
					url: 'https://schema-registry.local:8081',
					authentication: 'basicAuth',
					username: 'registry-user',
					password: '',
				} satisfies ICredentialDataDecryptedObject,
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(result).not.toHaveProperty('auth');
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
			expect(result).not.toHaveProperty('auth');
			expect(result.headers).toEqual({
				'Content-Type': 'application/json',
			});
		});
	});
});
