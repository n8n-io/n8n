import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { HttpTemplatedCustomAuth } from '../HttpTemplatedCustomAuth.credentials';

const credential = new HttpTemplatedCustomAuth();

function credentials(): ICredentialDataDecryptedObject {
	return {
		template: JSON.stringify({ headers: { Authorization: 'Bearer {{api_key}}' } }),
		placeholderDefs: JSON.stringify([{ name: 'api_key', type: 'password' }]),
		placeholderValues: JSON.stringify({ api_key: 'secret' }),
		serviceOrigin: 'https://api.example.com',
	};
}

async function authenticate(
	credentialData: ICredentialDataDecryptedObject,
	requestOptions: IHttpRequestOptions,
) {
	if (typeof credential.authenticate !== 'function') throw new Error('Expected an authenticator');
	return await credential.authenticate(credentialData, requestOptions);
}

describe('HttpTemplatedCustomAuth', () => {
	it('applies authentication to HTTP request options', async () => {
		const result = await authenticate(credentials(), {
			url: 'https://api.example.com/v1/profile',
			method: 'GET',
		});

		expect(result.headers).toEqual({ Authorization: 'Bearer secret' });
	});

	it('applies authentication to legacy pagination request options', async () => {
		const result = await authenticate(credentials(), {
			uri: 'https://api.example.com/v1/profile',
			method: 'GET',
		} as unknown as IHttpRequestOptions);

		expect(result.headers).toEqual({ Authorization: 'Bearer secret' });
	});
});
