import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Request, Response } from 'express';
import { DynamicCredentialsController } from '@/modules/dynamic-credentials.ee/dynamic-credentials.controller';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { OauthService } from '@/oauth/oauth.service';

jest.mock('axios');

describe('DynamicCredentialsController', () => {
	const enterpriseCredentialsService = mockInstance(EnterpriseCredentialsService);
	const oauthService = mockInstance(OauthService);

	mockInstance(Logger);

	const controller = Container.get(DynamicCredentialsController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('authorizeCredential', () => {
		it('should throw NotFoundError when credential is not found', async () => {
			const req = mock<Request>({
				params: { id: 'non-existent-id' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(null);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Credential not found',
			);
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('non-existent-id');
		});

		it('should throw BadRequestError when credential type is not OAuth2 or OAuth1', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'httpBasicAuth',
			});
			const req = mock<Request>({
				params: { id: '1' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Credential type not supported',
			);
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
		});

		it('should return auth URI for OAuth2 credential', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			);

			const authUri = await controller.authorizeCredential(req, res);

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(mockCredential, {
				cid: '1',
				authorizationHeader: 'Bearer token123',
			});
		});

		it('should return auth URI for OAuth1 credential', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'twitterOAuth1Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth1AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth/authorize?oauth_token=random-token',
			);

			const authUri = await controller.authorizeCredential(req, res);

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalledWith(mockCredential, {
				cid: '1',
				authorizationHeader: 'Bearer token123',
			});
		});

		it('should handle request without authorization header', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				headers: { authorization: undefined },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			);

			const authUri = await controller.authorizeCredential(req, res);

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(mockCredential, {
				cid: '1',
				authorizationHeader: undefined,
			});
		});
	});
});
