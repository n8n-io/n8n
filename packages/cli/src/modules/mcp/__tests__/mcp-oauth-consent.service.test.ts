import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { mock } from 'jest-mock-extended';

import { McpOAuthAuthorizationCodeService } from '../mcp-oauth-authorization-code.service';
import { McpOAuthConsentService } from '../mcp-oauth-consent.service';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { OAuthSessionService } from '../oauth-session.service';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';

let logger: jest.Mocked<Logger>;
let oauthSessionService: jest.Mocked<OAuthSessionService>;
let oauthClientRepository: jest.Mocked<OAuthClientRepository>;
let userConsentRepository: jest.Mocked<UserConsentRepository>;
let authorizationCodeService: jest.Mocked<McpOAuthAuthorizationCodeService>;
let service: McpOAuthConsentService;

describe('McpOAuthConsentService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		oauthSessionService = mockInstance(OAuthSessionService) as jest.Mocked<OAuthSessionService>;
		oauthClientRepository = mockInstance(
			OAuthClientRepository,
		) as jest.Mocked<OAuthClientRepository>;
		userConsentRepository = mockInstance(
			UserConsentRepository,
		) as jest.Mocked<UserConsentRepository>;
		authorizationCodeService = mockInstance(McpOAuthAuthorizationCodeService);

		service = new McpOAuthConsentService(
			logger,
			oauthSessionService,
			oauthClientRepository,
			userConsentRepository,
			authorizationCodeService,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getConsentDetails', () => {
		it('should return client details from valid session token', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: 'state',
			};
			const client = mock<OAuthClient>({
				id: 'client-123',
				name: 'Test Client',
			});

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toEqual({
				clientName: 'Test Client',
				clientId: 'client-123',
			});
			expect(oauthSessionService.verifySession).toHaveBeenCalledWith(sessionToken);
			expect(oauthClientRepository.findOne).toHaveBeenCalledWith({
				where: { id: 'client-123' },
			});
		});

		it('should return null when client not found', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'nonexistent-client',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(null);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toBeNull();
		});

		it('should return null and log error when session verification fails', async () => {
			const sessionToken = 'invalid-session-token';

			oauthSessionService.verifySession.mockImplementation(() => {
				throw new Error('Invalid session');
			});

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toBeNull();
			expect(logger.error).toHaveBeenCalledWith('Error getting consent details', {
				error: expect.any(Error),
			});
		});

		it('should return client details', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};
			const client = mock<OAuthClient>({
				id: 'client-123',
				name: 'Test Client',
			});

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toEqual({
				clientName: 'Test Client',
				clientId: 'client-123',
			});
		});
	});

	describe('handleConsentDecision', () => {
		it('should handle user denial', async () => {
			const sessionToken = 'valid-session-token';
			const userId = 'user-123';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: 'state-xyz',
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);

			const result = await service.handleConsentDecision(sessionToken, userId, false);

			expect(result.redirectUrl).toContain('error=access_denied');
			expect(result.redirectUrl).toContain(
				'error_description=User+denied+the+authorization+request',
			);
			expect(result.redirectUrl).toContain('state=state-xyz');
			expect(logger.info).toHaveBeenCalledWith('Consent denied', {
				clientId: 'client-123',
				userId: 'user-123',
			});
			expect(userConsentRepository.insert).not.toHaveBeenCalled();
		});

		it('should handle user approval and generate authorization code', async () => {
			const sessionToken = 'valid-session-token';
			const userId = 'user-123';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: 'state-xyz',
			};
			const authCode = 'generated-auth-code';

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			userConsentRepository.insert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			const result = await service.handleConsentDecision(sessionToken, userId, true);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).toContain('state=state-xyz');
			expect(userConsentRepository.insert).toHaveBeenCalledWith({
				userId: 'user-123',
				clientId: 'client-123',
				grantedAt: expect.any(Number),
			});
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				'state-xyz',
			);
			expect(logger.info).toHaveBeenCalledWith('Consent approved', {
				clientId: 'client-123',
				userId: 'user-123',
			});
		});

		it('should handle approval without state parameter', async () => {
			const sessionToken = 'valid-session-token';
			const userId = 'user-123';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
			};
			const authCode = 'generated-auth-code';

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			userConsentRepository.insert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			const result = await service.handleConsentDecision(sessionToken, userId, true);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).not.toContain('state=');
		});

		it('should throw error when session verification fails', async () => {
			const sessionToken = 'invalid-session-token';
			const userId = 'user-123';

			oauthSessionService.verifySession.mockImplementation(() => {
				throw new Error('Invalid session');
			});

			await expect(service.handleConsentDecision(sessionToken, userId, true)).rejects.toThrow(
				'Invalid or expired session',
			);
		});

		it('should handle denial without state parameter', async () => {
			const sessionToken = 'valid-session-token';
			const userId = 'user-123';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);

			const result = await service.handleConsentDecision(sessionToken, userId, false);

			expect(result.redirectUrl).toContain('error=access_denied');
			expect(result.redirectUrl).not.toContain('state=');
		});
	});
});
