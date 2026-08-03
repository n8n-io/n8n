import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { OperationalError, jsonParse } from 'n8n-workflow';

import { TOKEN_REQUEST_TIMEOUT } from '../common/token-request';
import {
	MicrosoftEntraServicePrincipalApi,
	getAccessToken,
} from '../MicrosoftEntraServicePrincipalApi.credentials';

const STATIC_NO_TOKEN_MESSAGE = 'Microsoft Entra authentication did not return an access token';

const TEST_PRIVATE_KEY =
	'-----BEGIN PRIVATE KEY-----MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDOTbaad5QVCuNX/6JIIMN7mwi3I7w6PIoZJ9PalrFls+hg/93cPuqqjFtpBFt3QJONATdY1CHWHExAYv5QkXaf70Yf1B8zkuWgkcAuYBaRQAlSM0v3VRzBZwaJ6VcGB8Q6qlukavAy7PauAHAXgsbWfwQiTftP2JXiqW5rq0UQug9P8ehpyL5S4VCPgglFe1XpWAfSuPV5QJpDCN/tnERaL5f1XwN55l6lJ/sAN/S4oiRczgZ1gHX1Iu8yj2llpgVbZgZnBpqKWbqyQ1XA4EUsnwDnuO/EbApyzx3RLVB/PLd2BZHfG7F4GIy7X3DiL03v/RQ0Lkwz30nsBy9j2GsXAgMBAAECggEAfbIHwdF9ndyGa8VLINslf5gUFVFmi6z7DxyfDZ2m9CpLOV5r1JdY7xSZVUDcYaosvEqzaCHHg+a15rzp6jjWp9dnSFk7sXadBdoH17mfxlvX0geDD20CGiwlZb2P0hLFUmEdeO3W75BFM/r8ULbTYzj8UdJlfl6d4/4LUvqFGAzL8vmjEAn6oxPgWjvX38qSf0PXX+mckSy4Xs/S2nhO4TSfedluGHPZblzS8P8b+YggzsI1LBhvayxdsidDEUgszmqhmFkL3ItNUZ7An4kaJUoaXsT8O0PCVO5SGpdfOsjw5cYMKzUJhzR9Kvz1MKL+4yRwuomcFDUlD6vQYS5E0QKBgQD5UBgR9UiMO/NGqFi29z2tKTCsZ9O9A94IStcrRFr2nzvMLG+We7GaDYtKKcp1bdWnmVN7R6OGkm2A3JK9dKfGZ2eZIMLP3wm4xWzklnPHBeJtNBoQUy6m6ZRuVUGON78MDYJ1yV2O2yKExEipOYrABGOwrrEYRipvqD7QmTRt+wKBgQDT1kvKXZfcjp+/nzNcXFsCBX7NUiRKgerJL5lDCiWV78IhXyTybI5vndeWtOWPccCwRAEaUGjBDDxN/o62HnDToCA6CuSO3jKETDx0sKaectLJoJIR0fJav43BZCN/yz2IpFx5337+KEohj+fwO0dtlMuqlwcrGFVN8Y9CQVi4lQKBgDELDHEb6zWK5YRUwX7cjAlwPN7tXb2k8Rx4fHNKcwposH6tjxXvJzTCzU+9gNIw1QKvKrjpksV6MIhU25jhRc/Fr59zzl7N5T+vtogRAJ16Dtykjyv+8QJsmIJLyyWK2c4pKiy5e+oKOXQcmJ6RbzXupx2uf6/ivZ5RXmnyeVnZAoGAfuAWvLmZvwvdOhPL20GlcGyCKc9M1SNC0ASmMrTdFhRnnT0zD89c8BUFjsoBxAxJcEkKsAwA8b62T7BrIUDSKq35H0pu4fLLJtnSS8GRyczT2tdFJU8tbJTV/kJP0LaVwEVQ7d2iXe8bl0ZtkECw4zz/TsjuDi2gyfIn73LcBJECgYAoWcd2MNH7NdIyYeHkePcmxKVUvMstkuSDjbabEKbLEvtnjN1HG3sZ2M+owODYAVcEzZr20w9nsRsPSEa5Lqra2Ymq0oDvZkEuBJv8M6QMOKzY0o8yuWgm/S9fY6+toQA8QNaC/8Ojl0CL/TVMAE6Ri/DpCyvr54Gsm8fiRDSsww==-----END PRIVATE KEY-----';

const TEST_CERTIFICATE =
	'-----BEGIN CERTIFICATE-----MIICqDCCAZACCQCCBsk1456fOjANBgkqhkiG9w0BAQsFADAWMRQwEgYDVQQDDAtlbnQxMDAtdGVzdDAeFw0yNjA2MjQxMjM2NDZaFw0zNjA2MjExMjM2NDZaMBYxFDASBgNVBAMMC2VudDEwMC10ZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzk22mneUFQrjV/+iSCDDe5sItyO8OjyKGSfT2paxZbPoYP/d3D7qqoxbaQRbd0CTjQE3WNQh1hxMQGL+UJF2n+9GH9QfM5LloJHALmAWkUAJUjNL91UcwWcGielXBgfEOqpbpGrwMuz2rgBwF4LG1n8EIk37T9iV4qlua6tFELoPT/Hoaci+UuFQj4IJRXtV6VgH0rj1eUCaQwjf7ZxEWi+X9V8DeeZepSf7ADf0uKIkXM4GdYB19SLvMo9pZaYFW2YGZwaailm6skNVwOBFLJ8A57jvxGwKcs8d0S1Qfzy3dgWR3xuxeBiMu19w4i9N7/0UNC5MM99J7AcvY9hrFwIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQC/Ke/e7fK0OT7/JBMfwj81stZ5kRJ3S/nvdtlnA+htRSWt17crZRIta6gYUuEFl+sQquKDzXHL70eO4FzfHxAJ5HKgANvb1RIm5NeWxOHCvwIbbNRDbjlPJ6TulO2L29DK7N8U43EhbVLuJ16OQQsf5kN2OGBRCxBz4rzVywvus+TSLfmYHHGbgdyFkuNH6J7V+VrbefNPy/4BiTo2nj7hcdtdVNnrydJhniqUcrWJN4aiiyFQ6G4tum+EgcDAAdmSdY6EJhUYK6WAVoCHq5O97sYdSk0HeOwALnESSaVVksnGz/57h7cn+DK8zrrDbUCeq0L0Rc5i5mToAdSF4NQG-----END CERTIFICATE-----';

// SHA-1 thumbprint of TEST_CERTIFICATE, base64url-encoded (the JWT `x5t` header value).
const EXPECTED_X5T = 'aK3rs6ongTQ6RIYSBIx5LFJD-Q4';

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
		expect(authentication?.type).toBe('options');
		expect(authentication?.default).toBe('clientSecret');
		expect(
			authentication?.options?.map((option) => ('value' in option ? option.value : '')),
		).toEqual(['clientSecret', 'certificate']);

		const clientSecret = credential.properties.find(
			(property: INodeProperties) => property.name === 'clientSecret',
		);
		expect(clientSecret?.displayOptions?.show?.authentication).toEqual(['clientSecret']);
		expect(clientSecret?.typeOptions?.password).toBe(true);

		const privateKey = credential.properties.find(
			(property: INodeProperties) => property.name === 'privateKey',
		);
		expect(privateKey?.displayOptions?.show?.authentication).toEqual(['certificate']);
		expect(privateKey?.typeOptions?.password).toBe(true);

		const certificate = credential.properties.find(
			(property: INodeProperties) => property.name === 'certificate',
		);
		expect(certificate?.displayOptions?.show?.authentication).toEqual(['certificate']);

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

		describe('certificate authentication', () => {
			const certCredentials = {
				authentication: 'certificate',
				tenantId: 'tenant-id',
				clientId: 'client-id',
				clientSecret: 'stale-secret-should-not-be-sent',
				privateKey: TEST_PRIVATE_KEY,
				certificate: TEST_CERTIFICATE,
			};

			const postedBody = () =>
				new URLSearchParams((requestMock.mock.calls[0][0] as { body: string }).body);

			it('signs a client_assertion instead of sending a client_secret', async () => {
				await callPreAuthentication(certCredentials);

				const body = postedBody();
				expect(body.get('grant_type')).toBe('client_credentials');
				expect(body.get('client_id')).toBe('client-id');
				expect(body.get('client_assertion_type')).toBe(
					'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
				);
				expect(body.has('client_secret')).toBe(false);
				expect((requestMock.mock.calls[0][0] as { body: string }).body).not.toContain(
					'stale-secret-should-not-be-sent',
				);

				// The assertion is a JWT (header.payload.signature) whose `aud` is the token endpoint.
				const assertion = body.get('client_assertion') ?? '';
				const [headerSeg, payloadSeg] = assertion.split('.');
				expect(assertion.split('.')).toHaveLength(3);

				// The `x5t` header is the SHA-1 thumbprint of the certificate — asserting it proves
				// the credential forwarded *this* certificate into the assertion, not just any JWT.
				const header = jsonParse<{ x5t: string }>(
					Buffer.from(headerSeg, 'base64url').toString('utf8'),
				);
				expect(header.x5t).toBe(EXPECTED_X5T);

				const payload = jsonParse<{ aud: string; iss: string }>(
					Buffer.from(payloadSeg, 'base64url').toString('utf8'),
				);
				expect(payload.aud).toBe('https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');
				expect(payload.iss).toBe('client-id');
			});

			it.each([
				['missing privateKey', { ...certCredentials, privateKey: '' }],
				['missing certificate', { ...certCredentials, certificate: '' }],
			])('rejects before any token POST when %s', async (_label, credentials) => {
				await expect(callPreAuthentication(credentials)).rejects.toThrow(
					'Microsoft Entra credentials are incomplete',
				);
				expect(requestMock).not.toHaveBeenCalled();
			});
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
