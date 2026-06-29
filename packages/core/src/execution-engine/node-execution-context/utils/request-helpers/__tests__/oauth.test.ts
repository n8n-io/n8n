import type { IAllExecuteFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';
import nock from 'nock';
import { mockDeep } from 'vitest-mock-extended';

import { refreshOAuth2Token, requestOAuth2 } from '../oauth';

describe('refreshOAuth2Token', () => {
	const baseUrl = 'https://example.com';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	// mockDeep auto-creates a proxy for module-augmented keys; the OAuth2
	// flow tests must opt out of the JWE proxy unless they wire one in.
	(mockAdditionalData as unknown as Record<string, unknown>)['oauth-jwe'] = undefined;
	const mockCredentialData = {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		grantType: 'authorizationCode',
		authUrl: 'https://example.com/auth',
		accessTokenUrl: 'https://example.com/token',
		authentication: 'body',
		scope: 'openid',
		oauthTokenData: {
			access_token: 'old-token',
			refresh_token: 'old-refresh-token',
		},
	};

	beforeEach(() => {
		nock.cleanAll();
		vi.resetAllMocks();
		mockNode.name = 'test-node-name';
		mockNode.credentials = {
			'test-credentials-type': {
				id: 'test-credentials-id',
				name: 'test-credentials-name',
			},
		};
	});

	test('should refresh the OAuth2 token with pkce grant type', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...mockCredentialData,
			clientSecret: undefined,
			grantType: 'pkce',
		});
		nock(baseUrl)
			.post('/token', {
				client_id: 'test-client-id',
				grant_type: 'refresh_token',
				refresh_token: 'old-refresh-token',
			})
			.reply(200, {
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});

		const result = await refreshOAuth2Token.call(
			mockThis,
			'test-credentials-type',
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({
			access_token: 'new-token',
			refresh_token: 'new-refresh-token',
		});
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).toHaveBeenCalledWith(
			mockNode.credentials!['test-credentials-type'],
			'test-credentials-type',
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				}),
			}),
			mockAdditionalData,
		);
	});

	test('should refresh the OAuth2 token with client credentials grant type', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...mockCredentialData,
			grantType: 'clientCredentials',
		});
		nock(baseUrl)
			.post('/token', {
				client_id: 'test-client-id',
				client_secret: 'test-client-secret',
				grant_type: 'client_credentials',
				scope: 'openid',
			})
			.reply(200, {
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});

		const result = await refreshOAuth2Token.call(
			mockThis,
			'test-credentials-type',
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({
			access_token: 'new-token',
			refresh_token: 'new-refresh-token',
		});
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).toHaveBeenCalledWith(
			mockNode.credentials!['test-credentials-type'],
			'test-credentials-type',
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				}),
			}),
			mockAdditionalData,
		);
	});

	test('should refresh the OAuth2 token with authorization code grant type', async () => {
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl)
			.post('/token', {
				client_id: 'test-client-id',
				client_secret: 'test-client-secret',
				grant_type: 'refresh_token',
				refresh_token: 'old-refresh-token',
			})
			.reply(200, {
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});

		const result = await refreshOAuth2Token.call(
			mockThis,
			'test-credentials-type',
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({
			access_token: 'new-token',
			refresh_token: 'new-refresh-token',
		});
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).toHaveBeenCalledWith(
			mockNode.credentials!['test-credentials-type'],
			'test-credentials-type',
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				}),
			}),
			mockAdditionalData,
		);
	});

	test('should throw an error if the OAuth2 token is not connected', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...mockCredentialData,
			oauthTokenData: undefined,
		});

		await expect(
			refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
		).rejects.toThrow('OAuth credentials not connected');
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).not.toHaveBeenCalled();
	});

	test('should throw an error if node does not have credentials', async () => {
		mockNode.credentials!['test-credentials-type'] = undefined!;
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl).post('/token').reply(200, {
			access_token: 'new-token',
			refresh_token: 'new-refresh-token',
		});

		await expect(
			refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
		).rejects.toThrow('Node does not have credential type');
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).not.toHaveBeenCalled();
	});

	test('should surface an actionable reconnect message when refresh returns invalid_grant', async () => {
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl).post('/token').reply(400, {
			error: 'invalid_grant',
			error_description: 'Token has been expired or revoked.',
		});

		const promise = refreshOAuth2Token.call(
			mockThis,
			'test-credentials-type',
			mockNode,
			mockAdditionalData,
		);

		await expect(promise).rejects.toThrow(
			'The credential "test-credentials-name" needs to be reconnected.',
		);
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('reconnect'),
			level: 'warning',
		});
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).not.toHaveBeenCalled();
	});

	test('should surface an actionable reconnect message when client credentials token fetch returns invalid_grant', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...mockCredentialData,
			grantType: 'clientCredentials',
		});
		nock(baseUrl).post('/token').reply(400, {
			error: 'invalid_grant',
		});

		await expect(
			refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
		).rejects.toThrow('The credential "test-credentials-name" needs to be reconnected.');
	});

	test('should rethrow non-invalid_grant token errors unchanged', async () => {
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl).post('/token').reply(400, {
			error: 'invalid_client',
		});

		await expect(
			refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
		).rejects.not.toThrow('needs to be reconnected');
	});

	test('should rethrow non-AuthError refresh failures unchanged', async () => {
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl).post('/token').replyWithError(new Error('network exploded'));

		const promise = refreshOAuth2Token.call(
			mockThis,
			'test-credentials-type',
			mockNode,
			mockAdditionalData,
		);

		await expect(promise).rejects.toThrow('network exploded');
		await expect(promise).rejects.not.toThrow('needs to be reconnected');
	});

	test('should fall back to credential type when no credential name is set', async () => {
		mockNode.credentials = {
			'test-credentials-type': { id: 'test-credentials-id', name: '' },
		};
		mockThis.getCredentials.mockResolvedValue(mockCredentialData);
		nock(baseUrl).post('/token').reply(400, { error: 'invalid_grant' });

		await expect(
			refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
		).rejects.toThrow('The credential of type "test-credentials-type" needs to be reconnected.');
	});

	describe('JWE decryption via oauth-jwe proxy', () => {
		beforeEach(() => {
			nock.cleanAll();
			vi.resetAllMocks();
			mockNode.name = 'test-node-name';
			mockNode.credentials = {
				'test-credentials-type': { id: 'test-credentials-id', name: 'test-credentials-name' },
			};
		});

		test('decrypts the refreshed token via the proxy when present', async () => {
			const oauthJweProxyProvider = {
				decryptOAuth2TokenData: vi.fn().mockResolvedValue({
					access_token: 'decrypted-token',
					refresh_token: 'new-refresh-token',
				}),
			};
			const additionalDataWithProxy = {
				...mockAdditionalData,
				'oauth-jwe': { oauthJweProxyProvider },
			} as unknown as IWorkflowExecuteAdditionalData;

			mockThis.getCredentials.mockResolvedValue({ ...mockCredentialData, jweEnabled: true });
			nock(baseUrl).post('/token').reply(200, {
				access_token: 'jwe-blob',
				refresh_token: 'new-refresh-token',
			});

			await refreshOAuth2Token.call(
				mockThis,
				'test-credentials-type',
				mockNode,
				additionalDataWithProxy,
			);

			expect(oauthJweProxyProvider.decryptOAuth2TokenData).toHaveBeenCalledWith(
				expect.objectContaining({ access_token: 'jwe-blob' }),
			);
			expect(
				additionalDataWithProxy.credentialsHelper.updateCredentialsOauthTokenData,
			).toHaveBeenCalledWith(
				expect.anything(),
				'test-credentials-type',
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({ access_token: 'decrypted-token' }),
				}),
				additionalDataWithProxy,
			);
		});

		test('passes refreshed token through unchanged when proxy is absent', async () => {
			mockThis.getCredentials.mockResolvedValue(mockCredentialData);
			nock(baseUrl).post('/token').reply(200, {
				access_token: 'plaintext-token',
				refresh_token: 'new-refresh-token',
			});

			const result = await refreshOAuth2Token.call(
				mockThis,
				'test-credentials-type',
				mockNode,
				mockAdditionalData,
			);

			expect(result.access_token).toBe('plaintext-token');
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).toHaveBeenCalled();
		});

		test('propagates plaintext rejection thrown by the proxy', async () => {
			const oauthJweProxyProvider = {
				decryptOAuth2TokenData: vi
					.fn()
					.mockRejectedValue(
						new UserError('Expected at least one JWE-encrypted token but received only plaintext'),
					),
			};
			const additionalDataWithProxy = {
				...mockAdditionalData,
				'oauth-jwe': { oauthJweProxyProvider },
			} as unknown as IWorkflowExecuteAdditionalData;

			mockThis.getCredentials.mockResolvedValue({ ...mockCredentialData, jweEnabled: true });
			nock(baseUrl).post('/token').reply(200, {
				access_token: 'plaintext',
				refresh_token: 'new-refresh-token',
			});

			await expect(
				refreshOAuth2Token.call(
					mockThis,
					'test-credentials-type',
					mockNode,
					additionalDataWithProxy,
				),
			).rejects.toThrow('Expected at least one JWE-encrypted token but received only plaintext');
			expect(
				additionalDataWithProxy.credentialsHelper.updateCredentialsOauthTokenData,
			).not.toHaveBeenCalled();
		});
	});
});

describe('requestOAuth2 - tokenExpiredStatusCode', () => {
	const baseUrl = 'https://api.example.com';
	const tokenUrl = 'https://auth.example.com';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	(mockAdditionalData as unknown as Record<string, unknown>)['oauth-jwe'] = undefined;

	const makeCredentialData = (overrides?: Record<string, unknown>) => ({
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		grantType: 'clientCredentials',
		accessTokenUrl: `${tokenUrl}/token`,
		authentication: 'body',
		scope: 'read',
		oauthTokenData: {
			access_token: 'expired-token',
			token_type: 'bearer',
		},
		...overrides,
	});

	beforeEach(() => {
		nock.cleanAll();
		vi.resetAllMocks();
		mockNode.name = 'test-node';
		mockNode.credentials = {
			testOAuth2: {
				id: 'cred-id',
				name: 'cred-name',
			},
		};
	});

	test('should retry on 401 by default (isN8nRequest path)', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData());

		// First call returns 401
		nock(baseUrl).get('/data').reply(401, 'Unauthorized');
		// Token re-fetch
		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'new-token',
			token_type: 'bearer',
		});
		// Retry succeeds
		nock(baseUrl).get('/data').reply(200, { success: true });

		mockThis.helpers.httpRequest.mockRejectedValueOnce(
			Object.assign(new Error('401'), { response: { status: 401 } }),
		);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

		const result = await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true, // isN8nRequest
		);

		expect(result).toEqual({ success: true });
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
	});

	test('should retry on custom tokenExpiredStatusCode from credentials (isN8nRequest path)', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData({ tokenExpiredStatusCode: 403 }));

		// Token re-fetch
		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'new-token',
			token_type: 'bearer',
		});

		mockThis.helpers.httpRequest.mockRejectedValueOnce(
			Object.assign(new Error('403'), { response: { status: 403 } }),
		);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

		const result = await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(result).toEqual({ success: true });
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
	});

	test('should NOT retry on 401 when credential sets tokenExpiredStatusCode to 403 (isN8nRequest path)', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData({ tokenExpiredStatusCode: 403 }));

		const error401 = Object.assign(new Error('401'), { response: { status: 401 } });
		mockThis.helpers.httpRequest.mockRejectedValueOnce(error401);

		await expect(
			requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				undefined,
				true,
			),
		).rejects.toThrow('401');

		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(1);
	});

	test('credential-level tokenExpiredStatusCode should take priority over oAuth2Options', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData({ tokenExpiredStatusCode: 403 }));

		// Token re-fetch
		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'new-token',
			token_type: 'bearer',
		});

		// credential says 403, oAuth2Options says 429 — 403 should win
		const error403 = Object.assign(new Error('403'), { response: { status: 403 } });
		mockThis.helpers.httpRequest.mockRejectedValueOnce(error403);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

		const result = await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			{ tokenExpiredStatusCode: 429 },
			true,
		);

		expect(result).toEqual({ success: true });
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
	});

	test('should NOT retry on token-expired status when oAuth2Options.skipTokenRefresh is true (isN8nRequest path)', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData());
		const error401 = Object.assign(new Error('401'), { response: { status: 401 } });
		mockThis.helpers.httpRequest.mockRejectedValueOnce(error401);

		await expect(
			requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				{ skipTokenRefresh: true },
				true,
			),
		).rejects.toThrow('401');
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(1);
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).not.toHaveBeenCalled();
	});

	test('should NOT retry on token-expired status when oAuth2Options.skipTokenRefresh is true (legacy request path)', async () => {
		mockThis.getCredentials.mockResolvedValue(makeCredentialData());
		const error401 = Object.assign(new Error('401'), { statusCode: 401 });
		mockThis.helpers.request.mockRejectedValueOnce(error401);

		await expect(
			requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				{ skipTokenRefresh: true },
				false,
			),
		).rejects.toThrow('401');
		expect(mockThis.helpers.request).toHaveBeenCalledTimes(1);
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).not.toHaveBeenCalled();
	});
});

describe('requestOAuth2 - client credentials initial token fetch', () => {
	const baseUrl = 'https://api.example.com';
	const tokenUrl = 'https://auth.example.com';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	(mockAdditionalData as unknown as Record<string, unknown>)['oauth-jwe'] = undefined;

	beforeEach(() => {
		nock.cleanAll();
		vi.resetAllMocks();
		mockNode.name = 'test-node';
		mockNode.credentials = {
			testOAuth2: { id: 'cred-id', name: 'cred-name' },
		};
	});

	test('should not send scope parameter when scope is empty', async () => {
		mockThis.getCredentials.mockResolvedValue({
			clientId: 'client-id',
			clientSecret: 'client-secret',
			grantType: 'clientCredentials',
			accessTokenUrl: `${tokenUrl}/token`,
			authentication: 'body',
			scope: '',
			oauthTokenData: undefined,
		});

		// Token endpoint must NOT receive scope in body
		nock(tokenUrl)
			.post('/token', (body) => !('scope' in body) || body.scope === undefined)
			.reply(
				200,
				{ access_token: 'new-token', token_type: 'bearer' },
				{ 'content-type': 'application/json' },
			);

		nock(baseUrl).get('/data').reply(200, { success: true });

		mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true, // isN8nRequest
		);

		expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer new-token' }),
			}),
		);
	});

	test('should send scope parameter when scope is set', async () => {
		mockThis.getCredentials.mockResolvedValue({
			clientId: 'client-id',
			clientSecret: 'client-secret',
			grantType: 'clientCredentials',
			accessTokenUrl: `${tokenUrl}/token`,
			authentication: 'body',
			scope: 'read write',
			oauthTokenData: undefined,
		});

		nock(tokenUrl)
			.post('/token', (body) => body.scope === 'read write')
			.reply(
				200,
				{ access_token: 'scoped-token', token_type: 'bearer' },
				{ 'content-type': 'application/json' },
			);

		mockThis.helpers.httpRequest.mockResolvedValueOnce({ data: 'ok' });

		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer scoped-token' }),
			}),
		);
	});

	test('should throw OperationalError with clear message when token acquisition fails', async () => {
		mockThis.getCredentials.mockResolvedValue({
			clientId: 'client-id',
			clientSecret: 'wrong-secret',
			grantType: 'clientCredentials',
			accessTokenUrl: `${tokenUrl}/token`,
			authentication: 'body',
			scope: '',
			oauthTokenData: undefined,
		});

		nock(tokenUrl)
			.post('/token')
			.reply(
				400,
				{ error: 'invalid_client', error_description: 'Invalid client credentials' },
				{ 'content-type': 'application/json' },
			);

		const promise = requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		await expect(promise).rejects.toThrow(OperationalError);
		await expect(promise).rejects.toThrow('Failed to acquire OAuth2 access token');
	});
});

describe('requestOAuth2 - preAuthentication', () => {
	const baseUrl = 'https://api.example.com';
	const tokenUrl = 'https://auth.example.com';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();

	const credentialData = () => ({
		clientId: 'client-id',
		clientSecret: 'client-secret',
		grantType: 'authorizationCode',
		authUrl: `${tokenUrl}/auth`,
		accessTokenUrl: `${tokenUrl}/token`,
		authentication: 'body',
		scope: 'openid',
		oauthTokenData: {
			access_token: 'raw-token',
			refresh_token: 'old-refresh',
			token_type: 'bearer',
		},
	});

	beforeEach(() => {
		nock.cleanAll();
		vi.resetAllMocks();
		mockNode.name = 'test-node';
		mockNode.credentials = {
			testOAuth2: { id: 'cred-id', name: 'cred-name' },
		};
	});

	test('initial path: signs request with token transformed by preAuthentication', async () => {
		mockThis.getCredentials.mockResolvedValue(credentialData());
		mockAdditionalData.credentialsHelper.runPreAuthentication.mockResolvedValue({
			oauthTokenData: {
				access_token: 'transformed-token',
				token_type: 'bearer',
			},
		});

		mockThis.helpers.httpRequest.mockResolvedValueOnce({ ok: true });

		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(mockAdditionalData.credentialsHelper.runPreAuthentication).toHaveBeenCalled();
		const preAuthCall = mockAdditionalData.credentialsHelper.runPreAuthentication.mock.calls[0];
		expect(preAuthCall[2]).toBe('testOAuth2');
		// runPreAuthentication is the non-persisting variant — must not call updateCredentials
		expect(mockAdditionalData.credentialsHelper.updateCredentials).not.toHaveBeenCalled();
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer transformed-token' }),
			}),
		);
	});

	test('initial path: undefined preAuthentication leaves request untouched', async () => {
		mockThis.getCredentials.mockResolvedValue(credentialData());
		mockAdditionalData.credentialsHelper.runPreAuthentication.mockResolvedValue(undefined);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ ok: true });

		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer raw-token' }),
			}),
		);
	});

	test('refresh path: retry signs with preAuthentication-transformed refreshed token and persists it', async () => {
		mockThis.getCredentials.mockResolvedValue(credentialData());

		// preAuthentication is called twice (initial + refresh). Initial returns undefined
		// so the 401 fires; refresh returns a transformed token.
		mockAdditionalData.credentialsHelper.runPreAuthentication
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({
				oauthTokenData: {
					access_token: 'transformed-refreshed',
					refresh_token: 'new-refresh',
					token_type: 'bearer',
				},
			});

		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'raw-refreshed',
			refresh_token: 'new-refresh',
			token_type: 'bearer',
		});

		mockThis.helpers.httpRequest.mockRejectedValueOnce(
			Object.assign(new Error('401'), { response: { status: 401 } }),
		);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ ok: true });

		const result = await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(result).toEqual({ ok: true });
		expect(mockThis.helpers.httpRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer transformed-refreshed',
				}),
			}),
		);
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).toHaveBeenCalledWith(
			mockNode.credentials!.testOAuth2,
			'testOAuth2',
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({ access_token: 'transformed-refreshed' }),
			}),
			mockAdditionalData,
		);
	});

	test('refresh path: undefined preAuthentication signs retry with raw refreshed token', async () => {
		mockThis.getCredentials.mockResolvedValue(credentialData());
		mockAdditionalData.credentialsHelper.runPreAuthentication.mockResolvedValue(undefined);

		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'raw-refreshed',
			token_type: 'bearer',
		});

		mockThis.helpers.httpRequest.mockRejectedValueOnce(
			Object.assign(new Error('401'), { response: { status: 401 } }),
		);
		mockThis.helpers.httpRequest.mockResolvedValueOnce({ ok: true });

		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: `${baseUrl}/data` },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

		expect(mockThis.helpers.httpRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer raw-refreshed' }),
			}),
		);
	});

	test('refreshOAuth2Token: returns transformed data after preAuthentication', async () => {
		mockThis.getCredentials.mockResolvedValue(credentialData());
		mockAdditionalData.credentialsHelper.runPreAuthentication.mockResolvedValue({
			oauthTokenData: {
				access_token: 'transformed-refreshed',
				refresh_token: 'new-refresh',
				token_type: 'bearer',
			},
		});

		nock(tokenUrl).post('/token').reply(200, {
			access_token: 'raw-refreshed',
			refresh_token: 'new-refresh',
			token_type: 'bearer',
		});

		const result = await refreshOAuth2Token.call(
			mockThis,
			'testOAuth2',
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual(expect.objectContaining({ access_token: 'transformed-refreshed' }));
		expect(
			mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
		).toHaveBeenCalledWith(
			mockNode.credentials!.testOAuth2,
			'testOAuth2',
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({ access_token: 'transformed-refreshed' }),
			}),
			mockAdditionalData,
		);
	});
});
