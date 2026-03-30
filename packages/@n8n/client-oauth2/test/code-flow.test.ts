import nock from 'nock';

import { ClientOAuth2 } from '@/client-oauth2';
import { ClientOAuth2Token } from '@/client-oauth2-token';
import { AuthError } from '@/utils';

import * as config from './config';

describe('CodeFlow', () => {
	beforeAll(async () => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	const uri = `/auth/callback?code=${config.code}&state=${config.state}`;

	const githubAuth = new ClientOAuth2({
		clientId: config.clientId,
		clientSecret: config.clientSecret,
		accessTokenUri: config.accessTokenUri,
		authorizationUri: config.authorizationUri,
		authorizationGrants: ['code'],
		redirectUri: config.redirectUri,
		scopes: ['notifications'],
	});

	describe('#getUri', () => {
		it('should return a valid uri', () => {
			expect(githubAuth.code.getUri()).toEqual(
				`${config.authorizationUri}?client_id=abc&` +
					`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
					'response_type=code&scope=notifications',
			);
		});

		describe('when scopes are undefined', () => {
			it('should not include scope in the uri', () => {
				const authWithoutScopes = new ClientOAuth2({
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					accessTokenUri: config.accessTokenUri,
					authorizationUri: config.authorizationUri,
					authorizationGrants: ['code'],
					redirectUri: config.redirectUri,
				});
				expect(authWithoutScopes.code.getUri()).toEqual(
					`${config.authorizationUri}?client_id=abc&` +
						`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
						'response_type=code',
				);
			});
		});

		it('should include empty scopes array as an empty string', () => {
			const authWithEmptyScopes = new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationUri: config.authorizationUri,
				authorizationGrants: ['code'],
				redirectUri: config.redirectUri,
				scopes: [],
			});
			expect(authWithEmptyScopes.code.getUri()).toEqual(
				`${config.authorizationUri}?client_id=abc&` +
					`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
					'response_type=code&scope=',
			);
		});

		it('should include empty scopes string as an empty string', () => {
			const authWithEmptyScopes = new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationUri: config.authorizationUri,
				authorizationGrants: ['code'],
				redirectUri: config.redirectUri,
				scopes: [],
			});
			expect(authWithEmptyScopes.code.getUri()).toEqual(
				`${config.authorizationUri}?client_id=abc&` +
					`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
					'response_type=code&scope=',
			);
		});

		describe('when authorizationUri contains query parameters', () => {
			it('should preserve query string parameters', () => {
				const authWithParams = new ClientOAuth2({
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					accessTokenUri: config.accessTokenUri,
					authorizationUri: `${config.authorizationUri}?bar=qux`,
					authorizationGrants: ['code'],
					redirectUri: config.redirectUri,
					scopes: ['notifications'],
				});
				expect(authWithParams.code.getUri()).toEqual(
					`${config.authorizationUri}?bar=qux&client_id=abc&` +
						`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
						'response_type=code&scope=notifications',
				);
			});
		});

		describe('when authorizationUri contains a fragment (hash)', () => {
			it('should append query parameters after the fragment', () => {
				const authWithFragment = new ClientOAuth2({
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					accessTokenUri: config.accessTokenUri,
					authorizationUri: 'https://app.apollo.io/#/oauth/authorize',
					authorizationGrants: ['code'],
					redirectUri: config.redirectUri,
					scopes: ['notifications'],
				});
				const uri = authWithFragment.code.getUri();
				expect(uri).toEqual(
					'https://app.apollo.io/#/oauth/authorize?client_id=abc&' +
						`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
						'response_type=code&scope=notifications',
				);
				expect(uri.indexOf('?')).toBeGreaterThan(uri.indexOf('#'));
			});

			it('should handle fragments with existing query parameters', () => {
				const authWithFragmentAndParams = new ClientOAuth2({
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					accessTokenUri: config.accessTokenUri,
					authorizationUri: 'https://example.com/auth#/oauth/authorize?existing=param',
					authorizationGrants: ['code'],
					redirectUri: config.redirectUri,
					scopes: ['read', 'write'],
				});
				const uri = authWithFragmentAndParams.code.getUri();
				expect(uri).toEqual(
					'https://example.com/auth#/oauth/authorize?existing=param&client_id=abc&' +
						`redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
						'response_type=code&scope=read%20write',
				);
			});
		});
	});

	describe('#getToken', () => {
		const mockTokenCall = () =>
			nock(config.baseUrl)
				.post(
					'/login/oauth/access_token',
					({ code, grant_type, redirect_uri }) =>
						code === config.code &&
						grant_type === 'authorization_code' &&
						redirect_uri === config.redirectUri,
				)
				.once()
				.reply(200, {
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				});

		it('should request the token', async () => {
			mockTokenCall();
			const user = await githubAuth.code.getToken(uri);

			expect(user).toBeInstanceOf(ClientOAuth2Token);
			expect(user.accessToken).toEqual(config.accessToken);
			expect(user.tokenType).toEqual('bearer');
		});

		it('should reject with auth errors', async () => {
			let errored = false;

			try {
				await githubAuth.code.getToken(`${config.redirectUri}?error=invalid_request`);
			} catch (err) {
				errored = true;
				expect(err).toBeInstanceOf(AuthError);
				if (err instanceof AuthError) {
					expect(err.code).toEqual('EAUTH');
					expect(err.body.error).toEqual('invalid_request');
				}
			}
			expect(errored).toEqual(true);
		});

		describe('#sign', () => {
			it('should be able to sign a standard request object', async () => {
				mockTokenCall();
				const token = await githubAuth.code.getToken(uri);
				const requestOptions = token.sign({
					method: 'GET',
					url: 'http://api.github.com/user',
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
				mockTokenCall();
				const token = await githubAuth.code.getToken(uri, { state: config.state });
				expect(token.refreshToken).toEqual(config.refreshToken);

				mockRefreshCall();
				const token1 = await token.refresh();
				expect(token1).toBeInstanceOf(ClientOAuth2Token);
				expect(token1.accessToken).toEqual(config.refreshedAccessToken);
				expect(token1.refreshToken).toEqual(config.refreshedRefreshToken);
				expect(token1.tokenType).toEqual('bearer');
			});
		});
	});
});
