import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { CalendlyApi } from '../CalendlyApi.credentials';

describe('CalendlyApi Credential', () => {
	const credential = new CalendlyApi();

	it('should use Calendly API v2 for credential tests', () => {
		expect(credential.name).toBe('calendlyApi');
		expect(credential.displayName).toBe('Calendly Personal Access Token API');
		expect(credential.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					displayName: 'Personal Access Token',
					name: 'apiKey',
					typeOptions: { password: true },
				}),
			]),
		);
		expect(credential.test.request).toEqual({
			baseURL: 'https://api.calendly.com',
			url: '/users/me',
		});
	});

	it('should add personal access token as a bearer token', async () => {
		const requestOptions: IHttpRequestOptions = {
			headers: {
				'Content-Type': 'application/json',
			},
			url: '/users/me',
		};

		const result = await credential.authenticate(
			{ apiKey: 'test-personal-access-token' } satisfies ICredentialDataDecryptedObject,
			requestOptions,
		);

		expect(result.headers).toEqual({
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-personal-access-token',
		});
		expect(result.headers).not.toHaveProperty('X-TOKEN');
	});
});
