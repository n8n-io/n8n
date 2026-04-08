import nock from 'nock';

import { ClientOAuth2 } from '@/client-oauth2';
import { ClientOAuth2Token } from '@/client-oauth2-token';
import type { Headers } from '@/types';

import * as config from './config';

describe('PKCE Flow', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	beforeEach(() => jest.clearAllMocks());

	describe('PKCE Authorization Code Flow', () => {
		const createPkceClient = (clientSecret?: string) =>
			new ClientOAuth2({
				clientId: config.clientId,
				clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationUri: config.authorizationUri,
				authorizationGrants: ['code'],
				redirectUri: config.redirectUri,
				scopes: ['read', 'write'],
			});

		describe('#getUri with PKCE parameters', () => {
			it('should include code_challenge and code_challenge_method in authorization URI', () => {
				const client = createPkceClient();
				const codeChallenge = 'test_code_challenge';
				const uri = client.code.getUri({
					query: {
						code_challenge: codeChallenge,
						code_challenge_method: 'S256',
					},
				});

				expect(uri).toContain(`code_challenge=${codeChallenge}`);
				expect(uri).toContain('code_challenge_method=S256');
			});
		});

		describe('#getToken with PKCE', () => {
			const mockPkceTokenCall = (
				options: {
					expectClientSecret?: boolean;
					expectCodeVerifier?: boolean;
				} = {},
			) => {
				const { expectClientSecret = false, expectCodeVerifier = true } = options;

				return nock(config.baseUrl)
					.post('/login/oauth/access_token')
					.once()
					.reply(200, function (this: nock.ReplyFnContext, _uri: string, requestBody: string) {
						// Verify PKCE parameters are included correctly
						if (expectCodeVerifier) {
							expect(requestBody).toContain('code_verifier=test_code_verifier');
						}

						expect(requestBody).toContain('grant_type=authorization_code');

						// For confidential clients, credentials are in Basic Auth header
						if (expectClientSecret) {
							expect(this.req.headers.authorization).toMatch(/^Basic /);
						} else {
							// For public clients, no authorization header but client_id may be in body
							expect(this.req.headers.authorization).toBeUndefined();
						}

						return {
							access_token: config.accessToken,
							refresh_token: config.refreshToken,
							token_type: 'Bearer',
						};
					});
			};

			it('should exchange authorization code with PKCE code_verifier for public client (no client_secret)', async () => {
				const client = createPkceClient(); // No client secret
				mockPkceTokenCall({ expectClientSecret: false });

				const uri = `${config.redirectUri}?code=${config.code}&state=${config.state}`;
				const token = await client.code.getToken(uri, {
					body: { code_verifier: 'test_code_verifier' },
				});

				expect(token).toBeInstanceOf(ClientOAuth2Token);
				expect(token.accessToken).toEqual(config.accessToken);
				expect(token.refreshToken).toEqual(config.refreshToken);
			});

			it('should exchange authorization code with PKCE code_verifier for confidential client (with client_secret)', async () => {
				const client = createPkceClient(config.clientSecret);
				mockPkceTokenCall({ expectClientSecret: true });

				const uri = `${config.redirectUri}?code=${config.code}&state=${config.state}`;
				const token = await client.code.getToken(uri, {
					body: { code_verifier: 'test_code_verifier' },
				});

				expect(token).toBeInstanceOf(ClientOAuth2Token);
				expect(token.accessToken).toEqual(config.accessToken);
				expect(token.refreshToken).toEqual(config.refreshToken);
			});
		});

		describe('#refresh for PKCE flows', () => {
			const mockRefreshCall = async (
				options: {
					expectClientSecret?: boolean;
				} = {},
			) => {
				const { expectClientSecret = false } = options;

				const nockScope = nock(config.baseUrl)
					.post('/login/oauth/access_token')
					.once()
					.reply(200, function (this: nock.ReplyFnContext, _uri: string, requestBody: string) {
						// Verify refresh token parameters
						expect(requestBody).toContain(`refresh_token=${config.refreshToken}`);
						expect(requestBody).toContain('grant_type=refresh_token');

						// For confidential clients, credentials are in Basic Auth header
						if (expectClientSecret) {
							expect(this.req.headers.authorization).toMatch(/^Basic /);
							// client_id should not be in body when using Basic Auth
							expect(requestBody).not.toContain('client_id=');
						} else {
							// For public clients, client_id should be in body
							expect(requestBody).toContain(`client_id=${config.clientId}`);
							expect(this.req.headers.authorization).toBeUndefined();
						}

						return {
							access_token: config.refreshedAccessToken,
							refresh_token: config.refreshedRefreshToken,
							token_type: 'Bearer',
						};
					});

				return await new Promise<{ headers: Headers; body: string }>((resolve) => {
					nockScope.once('request', (req: { headers: Headers; requestBodyBuffers: Buffer }) => {
						resolve({
							headers: req.headers,
							body: req.requestBodyBuffers.toString('utf-8'),
						});
					});
				});
			};

			it('should refresh token for PKCE public client without client_secret', async () => {
				// Create token with public client (no client secret)
				const publicClient = createPkceClient();
				const token = new ClientOAuth2Token(publicClient, {
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
					token_type: 'Bearer',
				});

				const requestPromise = mockRefreshCall({ expectClientSecret: false });
				const refreshedToken = await token.refresh();
				const { body } = await requestPromise;

				expect(refreshedToken).toBeInstanceOf(ClientOAuth2Token);
				expect(refreshedToken.accessToken).toEqual(config.refreshedAccessToken);
				expect(refreshedToken.refreshToken).toEqual(config.refreshedRefreshToken);

				// Verify request body doesn't include client_secret but includes client_id
				expect(body).toContain(`client_id=${config.clientId}`);
				expect(body).not.toContain('client_secret=');
			});

			it('should refresh token for PKCE confidential client with client_secret', async () => {
				// Create token with confidential client (with client secret)
				const confidentialClient = createPkceClient(config.clientSecret);
				const token = new ClientOAuth2Token(confidentialClient, {
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
					token_type: 'Bearer',
				});

				const requestPromise = mockRefreshCall({ expectClientSecret: true });
				const refreshedToken = await token.refresh();
				const { headers, body } = await requestPromise;

				expect(refreshedToken).toBeInstanceOf(ClientOAuth2Token);
				expect(refreshedToken.accessToken).toEqual(config.refreshedAccessToken);
				expect(refreshedToken.refreshToken).toEqual(config.refreshedRefreshToken);

				// Should use Basic Auth header for confidential clients
				expect(headers?.authorization).toBe('Basic YWJjOjEyMw==');
				expect(body).not.toContain('client_secret=');
			});
		});
	});
});
