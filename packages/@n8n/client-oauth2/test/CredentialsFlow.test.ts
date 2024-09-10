import nock from 'nock';
import type { Headers } from '../src/types';
import type { ClientOAuth2Options } from '../src';
import { ClientOAuth2, ClientOAuth2Token } from '../src';
import * as config from './config';

describe('CredentialsFlow', () => {
	beforeAll(async () => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	beforeEach(() => jest.clearAllMocks());

	describe('#getToken', () => {
		const createAuthClient = ({
			scopes,
			authentication,
		}: Pick<ClientOAuth2Options, 'scopes' | 'authentication'> = {}) =>
			new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authentication,
				authorizationGrants: ['credentials'],
				scopes,
			});

		const mockTokenCall = async ({ requestedScope }: { requestedScope?: string } = {}) => {
			const nockScope = nock(config.baseUrl)
				.post(
					'/login/oauth/access_token',
					({ scope, grant_type }) =>
						scope === requestedScope && grant_type === 'client_credentials',
				)
				.once()
				.reply(200, {
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
					scope: requestedScope,
				});
			return await new Promise<{ headers: Headers; body: unknown }>((resolve) => {
				nockScope.once('request', (req) => {
					resolve({
						headers: req.headers,
						body: req.requestBodyBuffers.toString('utf-8'),
					});
				});
			});
		};

		it('should request the token', async () => {
			const authClient = createAuthClient({ scopes: ['notifications'] });
			const requestPromise = mockTokenCall({ requestedScope: 'notifications' });

			const user = await authClient.credentials.getToken();

			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual('notifications');

			const { headers, body } = await requestPromise;
			expect(headers.authorization).toBe('Basic YWJjOjEyMw==');
			expect(body).toEqual('grant_type=client_credentials&scope=notifications');
		});

		it('when scopes are undefined, it should not send scopes to an auth server', async () => {
			const authClient = createAuthClient();
			const requestPromise = mockTokenCall();

			const user = await authClient.credentials.getToken();
			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual(undefined);

			const { body } = await requestPromise;
			expect(body).toEqual('grant_type=client_credentials');
		});

		it('when scopes is an empty array, it should send empty scope string to an auth server', async () => {
			const authClient = createAuthClient({ scopes: [] });
			const requestPromise = mockTokenCall({ requestedScope: '' });

			const user = await authClient.credentials.getToken();
			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual('');

			const { body } = await requestPromise;
			expect(body).toEqual('grant_type=client_credentials&scope=');
		});

		it('should handle authentication = "header"', async () => {
			const authClient = createAuthClient({ scopes: [] });
			const requestPromise = mockTokenCall({ requestedScope: '' });
			await authClient.credentials.getToken();
			const { headers, body } = await requestPromise;
			expect(headers?.authorization).toBe('Basic YWJjOjEyMw==');
			expect(body).toEqual('grant_type=client_credentials&scope=');
		});

		it('should handle authentication = "body"', async () => {
			const authClient = createAuthClient({ scopes: [], authentication: 'body' });
			const requestPromise = mockTokenCall({ requestedScope: '' });
			await authClient.credentials.getToken();
			const { headers, body } = await requestPromise;
			expect(headers?.authorization).toBe(undefined);
			expect(body).toEqual('grant_type=client_credentials&scope=&client_id=abc&client_secret=123');
		});

		describe('#sign', () => {
			it('should be able to sign a standard request object', async () => {
				const authClient = createAuthClient({ scopes: ['notifications'] });
				void mockTokenCall({ requestedScope: 'notifications' });

				const token = await authClient.credentials.getToken();
				const requestOptions = token.sign({
					method: 'GET',
					url: `${config.baseUrl}/test`,
				});

				expect(requestOptions.headers?.Authorization).toEqual(`Bearer ${config.accessToken}`);
			});
		});

		describe('#refresh', () => {
			const mockRefreshCall = async () => {
				const nockScope = nock(config.baseUrl)
					.post(
						'/login/oauth/access_token',
						({ refresh_token, grant_type }) =>
							refresh_token === config.refreshToken && grant_type === 'refresh_token',
					)
					.once()
					.reply(200, {
						access_token: config.refreshedAccessToken,
						refresh_token: config.refreshedRefreshToken,
					});
				return await new Promise<{ headers: Headers; body: unknown }>((resolve) => {
					nockScope.once('request', (req) => {
						resolve({
							headers: req.headers,
							body: req.requestBodyBuffers.toString('utf-8'),
						});
					});
				});
			};

			it('should make a request to get a new access token', async () => {
				const authClient = createAuthClient({ scopes: ['notifications'] });
				void mockTokenCall({ requestedScope: 'notifications' });

				const token = await authClient.credentials.getToken();
				expect(token.accessToken).toEqual(config.accessToken);

				const requestPromise = mockRefreshCall();
				const token1 = await token.refresh();
				await requestPromise;

				expect(token1).toBeInstanceOf(ClientOAuth2Token);
				expect(token1.accessToken).toEqual(config.refreshedAccessToken);
				expect(token1.tokenType).toEqual('bearer');
			});

			it('should make a request to get a new access token with authentication = "body"', async () => {
				const authClient = createAuthClient({ scopes: ['notifications'], authentication: 'body' });
				void mockTokenCall({ requestedScope: 'notifications' });

				const token = await authClient.credentials.getToken();
				expect(token.accessToken).toEqual(config.accessToken);

				const requestPromise = mockRefreshCall();
				const token1 = await token.refresh();
				const { headers, body } = await requestPromise;

				expect(token1).toBeInstanceOf(ClientOAuth2Token);
				expect(token1.accessToken).toEqual(config.refreshedAccessToken);
				expect(token1.tokenType).toEqual('bearer');
				expect(headers?.authorization).toBe(undefined);
				expect(body).toEqual(
					'refresh_token=def456token&grant_type=refresh_token&client_id=abc&client_secret=123',
				);
			});

			it('should make a request to get a new access token with authentication = "header"', async () => {
				const authClient = createAuthClient({
					scopes: ['notifications'],
					authentication: 'header',
				});
				void mockTokenCall({ requestedScope: 'notifications' });

				const token = await authClient.credentials.getToken();
				expect(token.accessToken).toEqual(config.accessToken);

				const requestPromise = mockRefreshCall();
				const token1 = await token.refresh();
				const { headers, body } = await requestPromise;

				expect(token1).toBeInstanceOf(ClientOAuth2Token);
				expect(token1.accessToken).toEqual(config.refreshedAccessToken);
				expect(token1.tokenType).toEqual('bearer');
				expect(headers?.authorization).toBe('Basic YWJjOjEyMw==');
				expect(body).toEqual('refresh_token=def456token&grant_type=refresh_token');
			});
		});
	});
});
