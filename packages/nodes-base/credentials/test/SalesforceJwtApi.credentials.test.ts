import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import type { Mock } from 'vitest';

import { SalesforceJwtApi, resolveAuthUrl } from '../SalesforceJwtApi.credentials';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn() },
}));
vi.mock('@utils/utilities', () => ({
	formatPrivateKey: (key: string) => key,
}));

describe('SalesforceJwtApi Credential', () => {
	const credential = new SalesforceJwtApi();
	const mockedSign = jwt.sign as unknown as Mock;

	const requestMock = vi.fn();
	const requestsMock = vi.fn(() => ({ request: requestMock }));
	const ssrfService = {} as SsrfProtectionService;
	let ssrfEnabled = false;

	// `this` for preAuthentication is unused now that the token POST goes through
	// the shared HTTP client, but the signature still requires the helper context.
	const helpers = { helpers: {} } as unknown as IHttpRequestHelper;

	const baseCredentials = {
		clientId: 'connected-app-client-id',
		username: 'user@example.com',
		privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
	};

	beforeEach(() => {
		ssrfEnabled = false;
		requestMock.mockReset();
		requestMock.mockResolvedValue({
			access_token: 'abc123',
			instance_url: 'https://acme.my.salesforce.com',
		});
		requestsMock.mockClear();
		mockedSign.mockReset();
		mockedSign.mockReturnValue('signed-jwt');

		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			if (token === SsrfProtectionConfig) return { enabled: ssrfEnabled };
			if (token === SsrfProtectionService) return ssrfService;
			throw new Error('unexpected DI token');
		});
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('salesforceJwtApi');
		expect(credential.displayName).toBe('Salesforce JWT API');
		expect(credential.documentationUrl).toBe('salesforce');
		expect(credential.test.request.baseURL).toBe(
			'={{$credentials?.myDomainUrl ? $credentials.myDomainUrl.replace(/\\/$/, "") : ($credentials?.environment === "sandbox" ? "https://test.salesforce.com" : "https://login.salesforce.com")}}',
		);
		expect(credential.test.request.url).toBe('/services/oauth2/userinfo');
	});

	it('caches the access token in an expirable hidden field', () => {
		const accessToken = credential.properties.find(
			(property: INodeProperties) => property.name === 'accessToken',
		);
		expect(accessToken?.type).toBe('hidden');
		expect(accessToken?.typeOptions?.expirable).toBe(true);

		const instanceUrl = credential.properties.find(
			(property: INodeProperties) => property.name === 'instanceUrl',
		);
		expect(instanceUrl?.type).toBe('hidden');
	});

	describe('resolveAuthUrl', () => {
		it('defaults to login.salesforce.com for production when My Domain URL is empty', () => {
			expect(
				resolveAuthUrl({ ...baseCredentials, environment: 'production', myDomainUrl: '' }),
			).toBe('https://login.salesforce.com');
		});

		it('defaults to test.salesforce.com for sandbox when My Domain URL is empty', () => {
			expect(resolveAuthUrl({ ...baseCredentials, environment: 'sandbox', myDomainUrl: '' })).toBe(
				'https://test.salesforce.com',
			);
		});

		it('falls back to the default when My Domain URL is missing', () => {
			expect(resolveAuthUrl({ ...baseCredentials, environment: 'production' })).toBe(
				'https://login.salesforce.com',
			);
		});

		it('uses the My Domain URL override when provided', () => {
			expect(
				resolveAuthUrl({
					...baseCredentials,
					environment: 'production',
					myDomainUrl: 'https://acme.my.salesforce.com',
				}),
			).toBe('https://acme.my.salesforce.com');
		});

		it('strips a trailing slash from the My Domain URL', () => {
			expect(
				resolveAuthUrl({
					...baseCredentials,
					environment: 'sandbox',
					myDomainUrl: 'https://acme--sandbox.sandbox.my.salesforce.com/',
				}),
			).toBe('https://acme--sandbox.sandbox.my.salesforce.com');
		});

		it('prefers the My Domain URL over the environment setting', () => {
			expect(
				resolveAuthUrl({
					...baseCredentials,
					environment: 'sandbox',
					myDomainUrl: 'https://acme.my.salesforce.com',
				}),
			).toBe('https://acme.my.salesforce.com');
		});
	});

	describe('preAuthentication', () => {
		const callPreAuthentication = async (credentials: ICredentialDataDecryptedObject) =>
			await credential.preAuthentication.call(helpers, credentials);

		it('signs the JWT with the sandbox default audience when no My Domain URL is set', async () => {
			await callPreAuthentication({ ...baseCredentials, environment: 'sandbox', myDomainUrl: '' });

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://test.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://test.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('signs the JWT with the production default audience when no My Domain URL is set', async () => {
			await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: '',
			});

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://login.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://login.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it("signs the JWT with the Spring '26 sandbox My Domain URL as audience (issue #28990)", async () => {
			await callPreAuthentication({
				...baseCredentials,
				environment: 'sandbox',
				myDomainUrl: 'https://acme--sandbox.sandbox.my.salesforce.com',
			});

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme--sandbox.sandbox.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme--sandbox.sandbox.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('signs the JWT with a production My Domain URL as audience', async () => {
			await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: 'https://acme.my.salesforce.com',
			});

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('normalizes a trailing slash in the My Domain URL before signing', async () => {
			await callPreAuthentication({
				...baseCredentials,
				environment: 'sandbox',
				myDomainUrl: 'https://acme--sandbox.sandbox.my.salesforce.com/',
			});

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme--sandbox.sandbox.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme--sandbox.sandbox.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('posts the JWT assertion as a form-urlencoded token request', async () => {
			await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: '',
			});

			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed-jwt',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					json: true,
				}),
			);
		});

		it('disables SSRF protection when it is turned off in config', async () => {
			ssrfEnabled = false;

			await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: '',
			});

			expect(requestsMock).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});

		it('enables SSRF protection when it is turned on in config', async () => {
			ssrfEnabled = true;

			await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: '',
			});

			expect(requestsMock).toHaveBeenCalledWith({ ssrf: ssrfService });
		});

		it('returns the access token and instance URL to cache', async () => {
			requestMock.mockResolvedValueOnce({
				access_token: 'cached-token',
				instance_url: 'https://acme.my.salesforce.com',
			});

			const result = await callPreAuthentication({
				...baseCredentials,
				environment: 'production',
				myDomainUrl: '',
			});

			expect(result).toEqual({
				accessToken: 'cached-token',
				instanceUrl: 'https://acme.my.salesforce.com',
			});
		});

		it('throws when the token response is missing the access token or instance URL', async () => {
			requestMock.mockResolvedValueOnce({ access_token: 'cached-token' });

			await expect(
				callPreAuthentication({ ...baseCredentials, environment: 'production', myDomainUrl: '' }),
			).rejects.toThrow('Salesforce JWT authentication did not return an access token');
		});
	});

	describe('authenticate', () => {
		const credentials = {
			...baseCredentials,
			accessToken: 'cached-token',
			instanceUrl: 'https://acme.my.salesforce.com',
		};

		it('attaches the cached bearer token and resolves the instance URL for node requests', async () => {
			const result = await credential.authenticate(credentials, {
				headers: {},
				method: 'GET',
				url: '/services/data/v59.0/sobjects/Account/describe',
			});

			expect(result.headers?.Authorization).toBe('Bearer cached-token');
			expect(result.baseURL).toBe('https://acme.my.salesforce.com');
		});

		it('does not overwrite a baseURL provided by the caller (credential test)', async () => {
			const result = await credential.authenticate(credentials, {
				headers: {},
				method: 'GET',
				baseURL: 'https://login.salesforce.com',
				url: '/services/oauth2/userinfo',
			});

			expect(result.headers?.Authorization).toBe('Bearer cached-token');
			expect(result.baseURL).toBe('https://login.salesforce.com');
		});

		it('does not perform a token exchange', async () => {
			await credential.authenticate(credentials, {
				headers: {},
				method: 'GET',
				url: '/services/data/v59.0/sobjects/Account/describe',
			});

			expect(requestMock).not.toHaveBeenCalled();
			expect(mockedSign).not.toHaveBeenCalled();
		});
	});
});
