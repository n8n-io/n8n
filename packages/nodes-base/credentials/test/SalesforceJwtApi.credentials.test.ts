import axios from 'axios';
import jwt from 'jsonwebtoken';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { SalesforceJwtApi, resolveAuthUrl } from '../SalesforceJwtApi.credentials';

jest.mock('axios');
jest.mock('jsonwebtoken', () => ({
	sign: jest.fn(),
}));
jest.mock('@utils/utilities', () => ({
	formatPrivateKey: (key: string) => key,
}));

describe('SalesforceJwtApi Credential', () => {
	const credential = new SalesforceJwtApi();
	const mockedAxios = axios as unknown as jest.Mock;
	const mockedSign = jwt.sign as unknown as jest.Mock;

	const baseCredentials = {
		clientId: 'connected-app-client-id',
		username: 'user@example.com',
		privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
	};

	const requestOptions: IHttpRequestOptions = {
		headers: {},
		method: 'GET',
		url: 'https://login.salesforce.com/services/data/v59.0',
	};

	beforeEach(() => {
		mockedAxios.mockReset();
		mockedAxios.mockResolvedValue({ data: { access_token: 'abc123' } });
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

	describe('authenticate', () => {
		it('signs the JWT with the sandbox default audience when no My Domain URL is set', async () => {
			await credential.authenticate(
				{ ...baseCredentials, environment: 'sandbox', myDomainUrl: '' },
				requestOptions,
			);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://test.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://test.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('signs the JWT with the production default audience when no My Domain URL is set', async () => {
			await credential.authenticate(
				{ ...baseCredentials, environment: 'production', myDomainUrl: '' },
				requestOptions,
			);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://login.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://login.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it("signs the JWT with the Spring '26 sandbox My Domain URL as audience (issue #28990)", async () => {
			await credential.authenticate(
				{
					...baseCredentials,
					environment: 'sandbox',
					myDomainUrl: 'https://acme--sandbox.sandbox.my.salesforce.com',
				},
				requestOptions,
			);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme--sandbox.sandbox.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme--sandbox.sandbox.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('signs the JWT with a production My Domain URL as audience', async () => {
			await credential.authenticate(
				{
					...baseCredentials,
					environment: 'production',
					myDomainUrl: 'https://acme.my.salesforce.com',
				},
				requestOptions,
			);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('normalizes a trailing slash in the My Domain URL before signing', async () => {
			await credential.authenticate(
				{
					...baseCredentials,
					environment: 'sandbox',
					myDomainUrl: 'https://acme--sandbox.sandbox.my.salesforce.com/',
				},
				requestOptions,
			);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ aud: 'https://acme--sandbox.sandbox.my.salesforce.com' }),
				expect.any(String),
				expect.any(Object),
			);
			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://acme--sandbox.sandbox.my.salesforce.com/services/oauth2/token',
				}),
			);
		});

		it('attaches the returned access token to the outgoing request', async () => {
			const result = await credential.authenticate(
				{ ...baseCredentials, environment: 'production', myDomainUrl: '' },
				requestOptions,
			);

			expect(result.headers?.Authorization).toBe('Bearer abc123');
		});
	});
});
