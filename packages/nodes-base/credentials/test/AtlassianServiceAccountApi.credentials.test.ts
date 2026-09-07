import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';

import { TOKEN_REQUEST_TIMEOUT } from '../common/token-request';
import {
	AtlassianServiceAccountApi,
	getAccessToken,
} from '../AtlassianServiceAccountApi.credentials';

describe('AtlassianServiceAccountApi Credential', () => {
	const credential = new AtlassianServiceAccountApi();

	const requestMock = vi.fn();
	const requestsMock = vi.fn(() => ({ request: requestMock }));

	const helpers = { helpers: {} } as unknown as IHttpRequestHelper;

	const baseCredentials = {
		clientId: 'client-id',
		clientSecret: 'client-secret',
	};

	const callPreAuthentication = async (credentials: ICredentialDataDecryptedObject) =>
		await credential.preAuthentication.call(helpers, credentials);

	beforeEach(() => {
		requestMock.mockReset();
		requestMock.mockResolvedValue({ access_token: 'abc', token_type: 'Bearer', expires_in: 3600 });
		requestsMock.mockClear();

		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			throw new Error('unexpected DI token');
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should have correct static properties', () => {
		expect(credential.name).toBe('atlassianServiceAccountApi');
		expect(credential.displayName).toBe('Atlassian Service Account');
		expect(credential.documentationUrl).toBe('atlassianserviceaccount');
		expect(credential.icon).toBe('file:icons/Atlassian.svg');

		const accessToken = credential.properties.find(
			(property: INodeProperties) => property.name === 'accessToken',
		);
		expect(accessToken?.type).toBe('hidden');
		expect(accessToken?.typeOptions?.expirable).toBe(true);

		const clientSecret = credential.properties.find(
			(property: INodeProperties) => property.name === 'clientSecret',
		);
		expect(clientSecret?.typeOptions?.password).toBe(true);
		expect(clientSecret?.required).toBe(true);
		expect(credential.properties.map((property) => property.name)).not.toContain('domain');
	});

	it('tests the credential against the accessible-resources endpoint', () => {
		expect(credential.test.request.baseURL).toBe('https://api.atlassian.com');
		expect(credential.test.request.url).toBe('/oauth/token/accessible-resources');
		expect(credential.test.request.method).toBe('GET');
	});

	describe('preAuthentication / getAccessToken', () => {
		it('exchanges client credentials for an access token without a scope parameter', async () => {
			const result = await callPreAuthentication(baseCredentials);

			expect(result).toEqual({ accessToken: 'abc' });
			expect(requestMock).toHaveBeenCalledTimes(1);
			const options = requestMock.mock.calls[0][0] as IHttpRequestOptions;
			expect(options.url).toBe('https://auth.atlassian.com/oauth/token');
			expect(options.method).toBe('POST');
			expect(options.timeout).toBe(TOKEN_REQUEST_TIMEOUT);
			expect(options.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });

			const body = new URLSearchParams(options.body as string);
			expect(body.get('grant_type')).toBe('client_credentials');
			expect(body.get('client_id')).toBe('client-id');
			expect(body.get('client_secret')).toBe('client-secret');
			expect(body.has('scope')).toBe(false);
			expect(requestsMock).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
		});

		it('trims whitespace from the client ID and secret', async () => {
			await getAccessToken({ ...baseCredentials, clientId: '  client-id  ' });

			const body = new URLSearchParams(
				(requestMock.mock.calls[0][0] as IHttpRequestOptions).body as string,
			);
			expect(body.get('client_id')).toBe('client-id');
		});

		it.each([
			['clientId', { ...baseCredentials, clientId: '' }],
			['clientSecret', { ...baseCredentials, clientSecret: '   ' }],
			['clientId (non-string)', { ...baseCredentials, clientId: 12345 }],
		])('rejects incomplete credentials (%s) before any request', async (_label, credentials) => {
			const promise = getAccessToken(credentials);

			await expect(promise).rejects.toBeInstanceOf(UserError);
			await expect(promise).rejects.toThrow('Atlassian service account credentials are incomplete');
			expect(requestMock).not.toHaveBeenCalled();
		});

		it.each([400, 401, 403])(
			'maps a %d token response to a static credential error',
			async (status) => {
				requestMock.mockRejectedValue(
					Object.assign(new Error('Request failed'), { response: { status } }),
				);

				const promise = getAccessToken(baseCredentials);

				await expect(promise).rejects.toBeInstanceOf(UserError);
				await expect(promise).rejects.toThrow(
					'Atlassian rejected the service account credentials. Check the Client ID and Client Secret.',
				);
			},
		);

		it('rethrows non-auth token errors unchanged', async () => {
			requestMock.mockRejectedValue(
				Object.assign(new Error('socket hang up'), { response: { status: 502 } }),
			);

			await expect(getAccessToken(baseCredentials)).rejects.toThrow('socket hang up');
		});

		it('throws a static error when the response carries no access token', async () => {
			requestMock.mockResolvedValue({ token_type: 'Bearer' });
			const promise = getAccessToken(baseCredentials);

			await expect(promise).rejects.toBeInstanceOf(OperationalError);
			await expect(promise).rejects.toThrow(
				'Atlassian authentication did not return an access token',
			);
		});
	});

	describe('authenticate', () => {
		it('attaches the cached bearer token and preserves existing headers', async () => {
			const requestOptions = {
				url: 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/2/myself',
				headers: { Accept: 'application/json' },
			} as unknown as IHttpRequestOptions;

			const result = await credential.authenticate({ accessToken: 'cached-token' }, requestOptions);

			expect(result.headers).toEqual({
				Accept: 'application/json',
				Authorization: 'Bearer cached-token',
			});
		});
	});
});
