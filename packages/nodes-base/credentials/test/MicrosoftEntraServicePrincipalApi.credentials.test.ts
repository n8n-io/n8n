import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { TOKEN_REQUEST_TIMEOUT } from '../common/token-request';
import {
	MicrosoftEntraServicePrincipalApi,
	getAccessToken,
} from '../MicrosoftEntraServicePrincipalApi.credentials';

const STATIC_NO_TOKEN_MESSAGE = 'Microsoft Entra authentication did not return an access token';

describe('MicrosoftEntraServicePrincipalApi Credential', () => {
	const credential = new MicrosoftEntraServicePrincipalApi();

	const requestMock = vi.fn();
	const requestsMock = vi.fn(() => ({ request: requestMock }));

	// `this` for preAuthentication is unused now that the token POST goes through the
	// shared HTTP client, but the signature still requires the helper context.
	const helpers = { helpers: {} } as unknown as IHttpRequestHelper;

	const baseCredentials = {
		authentication: 'clientSecret',
		tenantId: 'tenant-id',
		clientId: 'client-id',
		clientSecret: 'client-secret',
	};

	const callPreAuthentication = async (credentials: ICredentialDataDecryptedObject) =>
		await credential.preAuthentication.call(helpers, credentials);

	beforeEach(() => {
		requestMock.mockReset();
		requestMock.mockResolvedValue({ access_token: 'abc', token_type: 'Bearer', expires_in: 3599 });
		requestsMock.mockClear();

		// Stub ONLY OutboundHttp. The `fixed-vendor` path short-circuits before reading
		// SsrfProtectionConfig/Service, so reaching any other DI token signals a regression
		// (e.g. switching to `user-controlled`) and must fail loudly.
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			throw new Error('unexpected DI token');
		});
	});

	it('should have correct static properties', () => {
		expect(credential.name).toBe('microsoftEntraServicePrincipalApi');
		expect(credential.displayName).toBe('Microsoft Entra Service Principal');
		expect(credential.documentationUrl).toBe('microsoftentra');
		expect(credential.icon).toBe('file:icons/Microsoft.svg');

		const accessToken = credential.properties.find(
			(property: INodeProperties) => property.name === 'accessToken',
		);
		expect(accessToken?.type).toBe('hidden');
		expect(accessToken?.typeOptions?.expirable).toBe(true);

		const authentication = credential.properties.find(
			(property: INodeProperties) => property.name === 'authentication',
		);
		expect(authentication?.type).toBe('hidden');
		expect(authentication?.default).toBe('clientSecret');

		const clientSecret = credential.properties.find(
			(property: INodeProperties) => property.name === 'clientSecret',
		);
		expect(clientSecret?.displayOptions?.show?.authentication).toEqual(['clientSecret']);
		expect(clientSecret?.typeOptions?.password).toBe(true);

		// App-only access has no granular-scope freedom, so there is no editable scope field;
		// the scope is derived from the selected cloud at mint time.
		const scope = credential.properties.find(
			(property: INodeProperties) => property.name === 'scope',
		);
		expect(scope).toBeUndefined();

		// Surfaces the admin-consent / Organization.Read.All requirement so the credential
		// test does not fail with an opaque 403.
		const setupNotice = credential.properties.find(
			(property: INodeProperties) => property.name === 'setupNotice',
		);
		expect(setupNotice?.type).toBe('notice');

		const graphApiBaseUrl = credential.properties.find(
			(property: INodeProperties) => property.name === 'graphApiBaseUrl',
		);
		expect(graphApiBaseUrl?.type).toBe('options');
		expect(
			graphApiBaseUrl?.options?.map((option) => ('value' in option ? option.value : '')),
		).toEqual([
			'https://graph.microsoft.com',
			'https://graph.microsoft.us',
			'https://dod-graph.microsoft.us',
			'https://microsoftgraph.chinacloudapi.cn',
		]);
	});

	it('should have the expected credential test request shape', () => {
		expect(credential.test.request.url).toBe('/v1.0/organization');
		expect(credential.test.request.method).toBe('GET');
		expect(credential.test.request.baseURL).toBe(
			'={{$credentials.graphApiBaseUrl || "https://graph.microsoft.com"}}',
		);
	});

	describe('preAuthentication', () => {
		it('mints a token and returns it as { accessToken }', async () => {
			requestMock.mockResolvedValueOnce({
				access_token: 'abc',
				expires_in: 3599,
				token_type: 'Bearer',
			});

			const result = await callPreAuthentication(baseCredentials);

			expect(result).toEqual({ accessToken: 'abc' });
		});

		it('mints when invoked with an empty cached accessToken (the Test button path)', async () => {
			requestMock.mockResolvedValueOnce({ access_token: 'minted-on-empty' });

			const result = await callPreAuthentication({ ...baseCredentials, accessToken: '' });

			expect(requestMock).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ accessToken: 'minted-on-empty' });
		});

		it('posts a correct client_credentials token request to the global host', async () => {
			await callPreAuthentication(baseCredentials);

			expect(requestMock).toHaveBeenCalledTimes(1);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
					body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=client-secret',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					json: true,
					timeout: TOKEN_REQUEST_TIMEOUT,
				}),
			);
		});

		it('trims whitespace from tenantId, clientId and clientSecret', async () => {
			await callPreAuthentication({
				...baseCredentials,
				tenantId: '  tenant-id  ',
				clientId: '  client-id  ',
				clientSecret: '  client-secret  ',
			});

			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
					body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=client-secret',
				}),
			);
		});

		it('mints via the SSRF-exempt fixed-vendor client', async () => {
			await callPreAuthentication(baseCredentials);

			// `{ ssrf: 'disabled' }` proves the fixed-vendor path; the `throw on other DI token`
			// mock proves SsrfProtectionConfig/Service are never consulted.
			expect(requestsMock).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});

		it('re-mints on each call without internal memoization', async () => {
			// The 401 trigger that drives re-minting on expiry lives in core
			// (request-helpers/authentication.ts) and is covered by core tests; here we only
			// prove the credential side has no caching, so that retry has a real re-mint to drive.
			requestMock.mockResolvedValueOnce({ access_token: 'tok1' });
			requestMock.mockResolvedValueOnce({ access_token: 'tok2' });

			const first = await callPreAuthentication(baseCredentials);
			const second = await callPreAuthentication(baseCredentials);

			expect(first).toEqual({ accessToken: 'tok1' });
			expect(second).toEqual({ accessToken: 'tok2' });
			expect(requestMock).toHaveBeenCalledTimes(2);
		});

		describe('scope derivation', () => {
			it('derives the global Graph resource scope when the base is global', async () => {
				await callPreAuthentication({
					...baseCredentials,
					graphApiBaseUrl: 'https://graph.microsoft.com',
				});

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=client-secret',
					}),
				);
			});

			it('derives the global Graph resource scope when the base is omitted', async () => {
				await callPreAuthentication(baseCredentials);

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=client-secret',
					}),
				);
			});

			it('derives the sovereign Graph resource scope from a US Gov base', async () => {
				await callPreAuthentication({
					...baseCredentials,
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.us%2F.default&client_secret=client-secret',
					}),
				);
			});

			it('derives the sovereign Graph resource scope from a trailing-slash US Gov base', async () => {
				await callPreAuthentication({
					...baseCredentials,
					graphApiBaseUrl: 'https://graph.microsoft.us/',
				});

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.us%2F.default&client_secret=client-secret',
					}),
				);
			});
		});

		// Documents the Phase-1 placeholder contract for the certificate branch (ENT-86):
		// it omits client_secret entirely. ENT-86 must change this deliberately.
		it('omits client_secret from the body for the certificate authentication branch', async () => {
			await callPreAuthentication({ ...baseCredentials, authentication: 'certificate' });

			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					body: 'grant_type=client_credentials&client_id=client-id&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default',
				}),
			);
		});

		describe('sovereign login host derivation', () => {
			const expectTokenHost = async (
				graphApiBaseUrl: string,
				expectedTokenUrl: string,
			): Promise<void> => {
				await callPreAuthentication({ ...baseCredentials, graphApiBaseUrl });

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({ url: expectedTokenUrl }),
				);
			};

			it('derives the China login host from the China Graph base', async () => {
				await expectTokenHost(
					'https://microsoftgraph.chinacloudapi.cn',
					'https://login.partner.microsoftonline.cn/tenant-id/oauth2/v2.0/token',
				);
			});

			it('derives the US Gov login host from the US Gov Graph base', async () => {
				await expectTokenHost(
					'https://graph.microsoft.us',
					'https://login.microsoftonline.us/tenant-id/oauth2/v2.0/token',
				);
			});

			it('normalizes a trailing slash before deriving the login host', async () => {
				await expectTokenHost(
					'https://graph.microsoft.us/',
					'https://login.microsoftonline.us/tenant-id/oauth2/v2.0/token',
				);
			});
		});

		describe('validation before any network call', () => {
			it.each([
				['missing tenantId', { ...baseCredentials, tenantId: '' }],
				['missing clientId', { ...baseCredentials, clientId: '' }],
				['missing clientSecret', { ...baseCredentials, clientSecret: '' }],
			])('rejects with an incomplete-credentials error when %s', async (_label, credentials) => {
				await expect(callPreAuthentication(credentials)).rejects.toThrow(OperationalError);
				await expect(callPreAuthentication(credentials)).rejects.toThrow(
					'Microsoft Entra credentials are incomplete',
				);
				expect(requestMock).not.toHaveBeenCalled();
			});

			it('rejects an invalid tenantId before any token POST', async () => {
				const credentials = { ...baseCredentials, tenantId: 'https://evil.com' };
				await expect(callPreAuthentication(credentials)).rejects.toThrow(OperationalError);
				await expect(callPreAuthentication(credentials)).rejects.toThrow(
					'Microsoft Entra tenant ID is not a valid GUID or domain',
				);
				expect(requestMock).not.toHaveBeenCalled();
			});

			it('rejects an unrecognized graphApiBaseUrl before any token POST', async () => {
				// An API-created credential can carry an arbitrary base URL; the token must never be
				// minted for it, otherwise the test request would send a valid Graph bearer elsewhere.
				const credentials = { ...baseCredentials, graphApiBaseUrl: 'https://evil.com' };
				await expect(callPreAuthentication(credentials)).rejects.toThrow(OperationalError);
				await expect(callPreAuthentication(credentials)).rejects.toThrow(
					'Microsoft Entra Graph API base URL is not a recognized Microsoft cloud',
				);
				expect(requestMock).not.toHaveBeenCalled();
			});
		});

		describe('malformed token response', () => {
			it.each([
				['no access_token field', { token_type: 'Bearer' }],
				['empty access_token', { access_token: '' }],
				['null access_token', { access_token: null }],
				['an AADSTS error body', { error: 'invalid_client', error_description: 'AADSTS7000215' }],
				['an empty object', {}],
			])(
				'rejects with an OperationalError carrying the static message for %s',
				async (_label, response) => {
					requestMock.mockResolvedValueOnce(response);

					const error = await callPreAuthentication(baseCredentials).catch((e: unknown) => e);

					expect(error).toBeInstanceOf(OperationalError);
					expect((error as OperationalError).message).toBe(STATIC_NO_TOKEN_MESSAGE);
				},
			);
		});
	});

	describe('getAccessToken', () => {
		it('accepts a GUID tenantId', async () => {
			await getAccessToken({
				...baseCredentials,
				tenantId: '12345678-1234-1234-1234-123456789abc',
			});

			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/oauth2/v2.0/token',
				}),
			);
		});
	});

	describe('authenticate', () => {
		it('attaches the cached bearer token to the request', async () => {
			const result = await credential.authenticate(
				{ accessToken: 'cached' },
				{ headers: {}, method: 'GET', url: '/v1.0/organization' },
			);

			expect(result.headers?.Authorization).toBe('Bearer cached');
		});

		it('reuses the cached token without performing a token exchange', async () => {
			const result = await credential.authenticate(
				{ ...baseCredentials, accessToken: 'cached' },
				{ headers: {}, method: 'GET', url: '/v1.0/organization' },
			);

			expect(result.headers?.Authorization).toBe('Bearer cached');
			expect(requestMock).not.toHaveBeenCalled();
		});

		it('reuses a single minted token across multiple requests (AC#3)', async () => {
			requestMock.mockResolvedValueOnce({ access_token: 'abc' });
			const { accessToken } = await callPreAuthentication(baseCredentials);

			const credentials = { ...baseCredentials, accessToken };
			for (let i = 0; i < 3; i++) {
				const result = await credential.authenticate(credentials, {
					headers: {},
					method: 'GET',
					url: `/v1.0/organization?attempt=${i}`,
				});
				expect(result.headers?.Authorization).toBe('Bearer abc');
			}

			expect(requestMock).toHaveBeenCalledTimes(1);
		});
	});
});
