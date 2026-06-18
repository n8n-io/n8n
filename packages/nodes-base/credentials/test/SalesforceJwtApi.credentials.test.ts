import jwt from 'jsonwebtoken';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

import { SalesforceJwtApi, resolveAuthUrl } from '../SalesforceJwtApi.credentials';
import type { Mock } from 'vitest';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn() },
}));
vi.mock('@utils/utilities', () => ({
	formatPrivateKey: (key: string) => key,
}));

describe('SalesforceJwtApi Credential', () => {
	const credential = new SalesforceJwtApi();
	const mockedSign = jwt.sign as unknown as Mock;
	const mockHttpRequest = vi.fn();
	const helpers = { helpers: { httpRequest: mockHttpRequest } } as unknown as IHttpRequestHelper;

	const baseCredentials = {
		clientId: 'connected-app-client-id',
		username: 'user@example.com',
		privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
	};

	beforeEach(() => {
		mockHttpRequest.mockReset();
		mockHttpRequest.mockResolvedValue({
			access_token: 'abc123',
			instance_url: 'https://acme.my.salesforce.com',
		});
		mockedSign.mockReset();
		mockedSign.mockReturnValue('signed-jwt');
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
			expect(mockHttpRequest).toHaveBeenCalledWith(
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
			expect(mockHttpRequest).toHaveBeenCalledWith(
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
			expect(mockHttpRequest).toHaveBeenCalledWith(
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
			expect(mockHttpRequest).toHaveBeenCalledWith(
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
			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme--sandbox.sandbox.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('returns the access token and instance URL to cache', async () => {
			mockHttpRequest.mockResolvedValueOnce({
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

			expect(mockHttpRequest).not.toHaveBeenCalled();
			expect(mockedSign).not.toHaveBeenCalled();
		});
	});
});
