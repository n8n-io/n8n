import nock from 'nock';
import { ClientOAuth2, ClientOAuth2Token } from '../src';
import * as config from './config';

describe('CredentialsFlow', () => {
	beforeAll(async () => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	describe('#getToken', () => {
		const createAuthClient = (scopes?: string[]) =>
			new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationGrants: ['credentials'],
				scopes,
			});

		const mockTokenCall = (requestedScope?: string) =>
			nock(config.baseUrl)
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

		it('should request the token', async () => {
			const authClient = createAuthClient(['notifications']);
			mockTokenCall('notifications');

			const user = await authClient.credentials.getToken();

			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual('notifications');
		});

		it('when scopes are undefined, it should not send scopes to an auth server', async () => {
			const authClient = createAuthClient();
			mockTokenCall();

			const user = await authClient.credentials.getToken();
			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual(undefined);
		});

		it('when scopes is an empty array, it should send empty scope string to an auth server', async () => {
			const authClient = createAuthClient([]);
			mockTokenCall('');

			const user = await authClient.credentials.getToken();
			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
			expect(user.data.scope).toEqual('');
		});

		describe('#sign', () => {
			it('should be able to sign a standard request object', async () => {
				const authClient = createAuthClient(['notifications']);
				mockTokenCall('notifications');

				const token = await authClient.credentials.getToken();
				const requestOptions = token.sign({
					method: 'GET',
					url: `${config.baseUrl}/test`,
				});

				expect(requestOptions.headers?.Authorization).toEqual(`Bearer ${config.accessToken}`);
			});
		});

		describe('#refresh', () => {
			const mockRefreshCall = () =>
				nock(config.baseUrl)
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

			it('should make a request to get a new access token', async () => {
				const authClient = createAuthClient(['notifications']);
				mockTokenCall('notifications');

				const token = await authClient.credentials.getToken();
				expect(token.accessToken).toEqual(config.accessToken);

				mockRefreshCall();
				const token1 = await token.refresh();
				expect(token1).toBeInstanceOf(ClientOAuth2Token);
				expect(token1.accessToken).toEqual(config.refreshedAccessToken);
				expect(token1.tokenType).toEqual('bearer');
			});
		});
	});
});
