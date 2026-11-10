import { readCustomModelEndpointCredential } from './credential-data';

describe('readCustomModelEndpointCredential', () => {
	describe('Base URL', () => {
		it('trims the value and removes trailing slashes', () => {
			const { baseUrl } = readCustomModelEndpointCredential({
				url: '  https://gateway.example.com/v1//  ',
			});

			expect(baseUrl).toBe('https://gateway.example.com/v1');
		});

		it('has no OpenAI default', () => {
			expect(readCustomModelEndpointCredential({}).baseUrl).toBe('');
		});
	});

	describe('login methods', () => {
		it('reads a Bearer token by default', () => {
			const { login } = readCustomModelEndpointCredential({ apiKey: '  sk-test ' });

			expect(login).toEqual({ type: 'bearer', token: 'sk-test' });
		});

		it('reads a Bearer token when the method is "bearer"', () => {
			const { login } = readCustomModelEndpointCredential({
				authentication: 'bearer',
				apiKey: 'sk-test',
			});

			expect(login).toEqual({ type: 'bearer', token: 'sk-test' });
		});

		it('reads the key, the header name and the prefix of "API key in header"', () => {
			const { login } = readCustomModelEndpointCredential({
				authentication: 'header',
				apiKey: ' key ',
				authHeaderName: ' Ocp-Apim-Subscription-Key ',
				authHeaderPrefix: ' Token ',
			});

			expect(login).toEqual({
				type: 'header',
				name: 'Ocp-Apim-Subscription-Key',
				prefix: 'Token',
				key: 'key',
			});
		});

		it('reads Basic auth and keeps the spaces of the password', () => {
			const { login } = readCustomModelEndpointCredential({
				authentication: 'basic',
				username: ' demo-user ',
				password: ' pass ',
			});

			expect(login).toEqual({ type: 'basic', username: 'demo-user', password: ' pass ' });
		});

		it('reads an empty password when there is none', () => {
			const { login } = readCustomModelEndpointCredential({
				authentication: 'basic',
				username: 'demo-user',
			});

			expect(login).toEqual({ type: 'basic', username: 'demo-user', password: '' });
		});

		it('reads "None"', () => {
			const { login } = readCustomModelEndpointCredential({ authentication: 'none' });

			expect(login).toEqual({ type: 'none' });
		});
	});

	describe('gateway headers', () => {
		it('reads the rows of the list', () => {
			const { gatewayHeaders } = readCustomModelEndpointCredential({
				gatewayHeaders: {
					headers: [
						{ name: ' x-gateway-team ', value: 'platform' },
						{ name: 'x-empty', value: '' },
					],
				},
			});

			expect(gatewayHeaders).toEqual({ 'x-gateway-team': 'platform', 'x-empty': '' });
		});

		it('drops a row without a name', () => {
			const { gatewayHeaders } = readCustomModelEndpointCredential({
				gatewayHeaders: { headers: [{ name: '', value: 'x' }, { value: 'y' }] },
			});

			expect(gatewayHeaders).toEqual({});
		});

		it('reads no headers when the credential has none', () => {
			expect(readCustomModelEndpointCredential({}).gatewayHeaders).toEqual({});
			expect(readCustomModelEndpointCredential({ gatewayHeaders: {} }).gatewayHeaders).toEqual({});
		});
	});
});
