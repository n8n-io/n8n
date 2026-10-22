import type {
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { readCustomModelEndpointCredential } from '../../utils/custom-model-endpoint/credential-data';
import { CustomModelEndpointApi } from '../CustomModelEndpointApi.credentials';

describe('CustomModelEndpointApi Credential', () => {
	const credential = new CustomModelEndpointApi();

	const findProperty = (name: string) =>
		credential.properties.find((property) => property.name === name);

	describe('form', () => {
		it('has the name of the credential', () => {
			expect(credential.name).toBe('customModelEndpointApi');
			expect(credential.displayName).toBe('Custom Model Endpoint');
			expect(credential.documentationUrl).toBe('custommodelendpoint');
		});

		it('requires a Base URL and has no OpenAI default', () => {
			expect(findProperty('url')).toMatchObject({ required: true, default: '' });
		});

		const loginMethods = ['bearer', 'header', 'basic', 'none'] as const;

		it('offers four login methods', () => {
			const options = (findProperty('authentication')?.options ?? []) as INodePropertyOptions[];

			expect(options.map(({ value }) => value)).toEqual(loginMethods);
		});

		it.each(loginMethods)('reads the login method "%s" of the form', (authentication) => {
			const { login } = readCustomModelEndpointCredential({ authentication });

			expect(login.type).toBe(authentication);
		});

		it('hides the values of the key, the password and the gateway headers', () => {
			expect(findProperty('apiKey')?.typeOptions).toMatchObject({ password: true });
			expect(findProperty('password')?.typeOptions).toMatchObject({ password: true });

			const rows = findProperty('gatewayHeaders')?.options?.[0];
			const valueField =
				rows && 'values' in rows ? rows.values.find(({ name }) => name === 'value') : undefined;
			expect(valueField?.typeOptions).toMatchObject({ password: true });
		});

		it('shows the fields of each login method only for that method', () => {
			expect(findProperty('apiKey')?.displayOptions?.show).toEqual({
				authentication: ['bearer', 'header'],
			});
			expect(findProperty('authHeaderName')?.displayOptions?.show).toEqual({
				authentication: ['header'],
			});
			expect(findProperty('username')?.displayOptions?.show).toEqual({
				authentication: ['basic'],
			});
			expect(findProperty('password')?.displayOptions?.show).toEqual({
				authentication: ['basic'],
			});
		});

		it('has no connection test', () => {
			expect(credential).not.toHaveProperty('test');
		});
	});

	describe('authenticate', () => {
		const authenticate = async (
			credentials: ICredentialDataDecryptedObject,
			requestOptions: IHttpRequestOptions = {
				url: '/models',
				baseURL: 'https://gw.example.com/v1',
			},
		) => await credential.authenticate(credentials, requestOptions);

		it('sends a Bearer token', async () => {
			const result = await authenticate({ authentication: 'bearer', apiKey: 'sk-test' });

			expect(result.headers).toEqual({ authorization: 'Bearer sk-test' });
		});

		it('sends the key in the named header and no Authorization header', async () => {
			const result = await authenticate({
				authentication: 'header',
				apiKey: 'sub-key-123',
				authHeaderName: 'Ocp-Apim-Subscription-Key',
			});

			expect(result.headers).toEqual({ 'ocp-apim-subscription-key': 'sub-key-123' });
		});

		it('sends Basic auth', async () => {
			const result = await authenticate({
				authentication: 'basic',
				username: 'demo-user',
				password: 'demo-pass',
			});

			expect(result.headers).toEqual({ authorization: 'Basic ZGVtby11c2VyOmRlbW8tcGFzcw==' });
		});

		it('sends no login header for "None"', async () => {
			const result = await authenticate({ authentication: 'none' });

			expect(result.headers).toEqual({});
		});

		it('sends the gateway headers with every login method', async () => {
			const result = await authenticate({
				authentication: 'none',
				gatewayHeaders: { headers: [{ name: 'x-gateway-team', value: 'platform' }] },
			});

			expect(result.headers).toEqual({ 'x-gateway-team': 'platform' });
		});

		it('keeps the headers that the request already has', async () => {
			const result = await authenticate(
				{ authentication: 'bearer', apiKey: 'sk-test' },
				{ url: '/models', headers: { 'x-request-id': 'r1' } },
			);

			expect(result.headers).toEqual({ authorization: 'Bearer sk-test', 'x-request-id': 'r1' });
		});

		it('replaces an Authorization header of the request with the login of the credential', async () => {
			const result = await authenticate(
				{ authentication: 'bearer', apiKey: 'sk-test' },
				{ url: '/models', headers: { Authorization: 'Bearer from-request' } },
			);

			expect(result.headers).toEqual({ authorization: 'Bearer sk-test' });
		});
	});
});
