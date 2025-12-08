import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type CredentialsEntity, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import axios from 'axios';
import type { Response } from 'express';
import { OAuth1CredentialController } from '@/controllers/oauth/oauth1-credential.controller';
import type { OAuthRequest } from '@/requests';
import { OauthService } from '@/oauth/oauth.service';
import { ExternalHooks } from '@/external-hooks';

jest.mock('axios');

describe('OAuth1CredentialController', () => {
	const oauthService = mockInstance(OauthService);

	mockInstance(Logger);
	mockInstance(ExternalHooks);

	const controller = Container.get(OAuth1CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('getAuthUri', () => {
		it('should return a valid auth URI', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			oauthService.getCredential.mockResolvedValueOnce(mockResolvedCredential);
			oauthService.createCsrfState.mockReturnValueOnce(['csrf-secret', 'state']);
			oauthService.getOAuthCredentials.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1' as const,
			});
			jest.mocked(axios).request.mockResolvedValueOnce({ data: { oauth_token: 'random-token' } });
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({
				user: mock<User>({ id: '123' }),
				query: { id: '1' },
			});
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({ csrfSecret: 'csrf-secret' }),
			);
		});
	});

	describe('handleCallback', () => {
		const validState = Buffer.from(
			JSON.stringify({
				token: 'token',
				cid: '1',
				createdAt: timestamp,
			}),
		).toString('base64');

		const res = mock<Response>();
		const req = mock<OAuthRequest.OAuth1Credential.Callback>({
			query: {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: validState,
			},
		});

		it('should render the error page when required query params are missing', async () => {
			const invalidReq = mock<OAuthRequest.OAuth1Credential.Callback>();
			invalidReq.query = { state: 'test' } as OAuthRequest.OAuth1Credential.Callback['query'];
			await controller.handleCallback(invalidReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Insufficient parameters for OAuth1 callback.',
				'Received following query parameters: {"state":"test"}',
			);
		});

		it('should exchange the code for a valid token, and save it to DB', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			oauthService.getCredential.mockResolvedValueOnce(mockResolvedCredential);
			// @ts-ignore
			oauthService.getDecryptedData.mockResolvedValue({ csrfSecret: 'invalid' });
			oauthService.getOAuthCredentials.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			});
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
			]);
			jest.mocked(axios).post.mockResolvedValueOnce({ data: { access_token: 'new_token' } });

			await controller.handleCallback(req, res);
			// @ts-ignore
			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: { access_token: 'new_token' },
				}),
				['csrfSecret'],
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
	});
});
