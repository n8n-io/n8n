import { QualysApiClientApi } from '../QualysApiClientApi.credentials';

describe('QualysApiClientApi Credential', () => {
	const credential = new QualysApiClientApi();

	it('should hold the platform and the API client fields', () => {
		const names = credential.properties.map((property) => property.name);

		expect(credential.name).toBe('qualysApiClientApi');
		expect(names).toEqual([
			'pod',
			'baseUrl',
			'platformUrl',
			'clientGrant',
			'clientId',
			'clientSecret',
			'requestedWith',
		]);
	});

	it('should test the credential against the client token endpoint', () => {
		expect(credential.test.request.method).toBe('POST');
		expect(credential.test.request.url).toBe("={{ '/auth/' + $credentials.clientGrant }}");
		expect(credential.test.request.headers).toMatchObject({
			clientId: '={{ $credentials.clientId }}',
			clientSecret: '={{ $credentials.clientSecret }}',
		});
	});

	it('should send the client secret only as a password field', () => {
		const secret = credential.properties.find((property) => property.name === 'clientSecret');

		expect(secret?.typeOptions?.password).toBe(true);
	});
});
