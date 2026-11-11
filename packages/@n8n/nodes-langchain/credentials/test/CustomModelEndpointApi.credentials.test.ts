import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { readCustomModelEndpointCredential } from '../../utils/custom-model-endpoint/credential-data';
import { CustomModelEndpointApi } from '../CustomModelEndpointApi.credentials';

describe('CustomModelEndpointApi Credential', () => {
	const credential = new CustomModelEndpointApi();

	const OAUTH2: ICredentialDataDecryptedObject = {
		authentication: 'oauth2',
		tokenUrl: 'https://login.example.com/oauth2/token',
		clientId: 'client-1',
		clientSecret: 'cs-9f2a71c4ab',
	};

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

		const loginMethods = ['bearer', 'header', 'basic', 'oauth2', 'none'] as const;

		it('offers five login methods', () => {
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

		it('sends the token that preAuthentication minted, beside the gateway headers', async () => {
			const result = await authenticate({
				...OAUTH2,
				sessionToken: 'tok-abc',
				gatewayHeaders: { headers: [{ name: 'x-gateway-team', value: 'platform' }] },
			});

			expect(result.headers).toEqual({
				authorization: 'Bearer tok-abc',
				'x-gateway-team': 'platform',
			});
		});

		it('sends no Authorization header before a token has been minted', async () => {
			const result = await authenticate(OAUTH2);

			expect(result.headers).toEqual({});
		});
	});

	it('declares the expirable slot the engine needs before it will run preAuthentication', () => {
		const slot = credential.properties.find(
			(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
		);

		expect(slot?.name).toBe('sessionToken');
		expect(slot?.typeOptions?.password).toBe(true);
	});

	describe('preAuthentication', () => {
		const minting = (response: unknown) => {
			const httpRequest = vi.fn(async () => response);
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;
			return {
				httpRequest,
				mint: async (credentials: ICredentialDataDecryptedObject) =>
					await credential.preAuthentication.call(helper, credentials),
			};
		};

		it('asks the login server for a token and hands it to authenticate', async () => {
			const { httpRequest, mint } = minting({ access_token: 'tok-abc', expires_in: 3600 });

			expect(await mint(OAUTH2)).toEqual({ sessionToken: 'tok-abc' });
			expect(httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://login.example.com/oauth2/token',
				headers: {
					accept: 'application/json',
					authorization: `Basic ${Buffer.from('client-1:cs-9f2a71c4ab').toString('base64')}`,
					'content-type': 'application/x-www-form-urlencoded',
				},
				body: 'grant_type=client_credentials',
				// A redirect would re-POST the secret somewhere else
				disableFollowRedirect: true,
			});
		});

		it('never surfaces the transport failure, which repeats the request that caused it', async () => {
			const pair = Buffer.from('client-1:cs-9f2a71c4ab').toString('base64');
			const httpRequest = vi.fn(async () => {
				throw new Error(`401 on POST with authorization: Basic ${pair}`);
			});
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			const error = await credential.preAuthentication.call(helper, OAUTH2).then(
				() => undefined,
				(reason: Error) => reason,
			);

			expect(error?.message).toBe('Could not sign in to the gateway');
			expect(JSON.stringify(error)).not.toContain(pair);
			expect(JSON.stringify(error)).not.toContain('cs-9f2a71c4ab');
		});

		it('keeps a refusal that names the host it turned down', async () => {
			const refusal = new UserError(
				'Domain not allowed: This credential is restricted from accessing login.example.com',
			);
			const httpRequest = vi.fn(async () => {
				throw refusal;
			});
			const helper = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

			await expect(credential.preAuthentication.call(helper, OAUTH2)).rejects.toThrow(
				'login.example.com',
			);
		});

		it('fails when the login server returns no access token', async () => {
			const { mint } = minting({ token_type: 'Bearer' });

			await expect(mint(OAUTH2)).rejects.toThrow('no access token');
		});

		it.each(['bearer', 'header', 'basic', 'none'] as const)(
			'asks for nothing when the login method is "%s"',
			async (authentication) => {
				const { httpRequest, mint } = minting({});

				expect(await mint({ authentication })).toEqual({});
				expect(httpRequest).not.toHaveBeenCalled();
			},
		);
	});
});
