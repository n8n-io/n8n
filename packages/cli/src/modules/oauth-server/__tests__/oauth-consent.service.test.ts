import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { mock } from 'jest-mock-extended';

import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { OAuthConsentService } from '../oauth-consent.service';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { OAuthSessionService } from '../oauth-session.service';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';
import {
	ProtectedResourceRegistry,
	type ProtectedResource,
} from '@/services/protected-resource.registry';

let logger: jest.Mocked<Logger>;
let oauthSessionService: jest.Mocked<OAuthSessionService>;
let oauthClientRepository: jest.Mocked<OAuthClientRepository>;
let userConsentRepository: jest.Mocked<UserConsentRepository>;
let authorizationCodeService: jest.Mocked<OAuthAuthorizationCodeService>;
let protectedResourceRegistry: jest.Mocked<ProtectedResourceRegistry>;
let service: OAuthConsentService;

describe('OAuthConsentService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		oauthSessionService = mockInstance(OAuthSessionService) as jest.Mocked<OAuthSessionService>;
		oauthClientRepository = mockInstance(
			OAuthClientRepository,
		) as jest.Mocked<OAuthClientRepository>;
		userConsentRepository = mockInstance(
			UserConsentRepository,
		) as jest.Mocked<UserConsentRepository>;
		authorizationCodeService = mockInstance(OAuthAuthorizationCodeService);
		protectedResourceRegistry = mockInstance(
			ProtectedResourceRegistry,
		) as jest.Mocked<ProtectedResourceRegistry>;

		service = new OAuthConsentService(
			logger,
			oauthSessionService,
			oauthClientRepository,
			userConsentRepository,
			authorizationCodeService,
			protectedResourceRegistry,
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
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
			});
			expect(oauthSessionService.verifySession).toHaveBeenCalledWith(sessionToken);
			expect(oauthClientRepository.findOne).toHaveBeenCalledWith({
				where: { id: 'client-123' },
			});
			expect(protectedResourceRegistry.getByResourceUrl).not.toHaveBeenCalled();
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
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
			});
		});

		it('should include the resource displayName as resourceName for a workflow resource', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
				resource: 'https://n8n.example.com/mcp/wf-123',
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(
				mock<ProtectedResource>({ displayName: 'My Workflow' }),
			);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				resourceName: 'My Workflow',
			});
			expect(protectedResourceRegistry.getByResourceUrl).toHaveBeenCalledWith(
				'https://n8n.example.com/mcp/wf-123',
			);
		});

		it('should omit resourceName for the instance MCP resource (no displayName)', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
				resource: 'https://n8n.example.com/mcp-server/http',
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(
				mock<ProtectedResource>({ id: 'instance-mcp', displayName: undefined }),
			);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				resourceName: undefined,
			});
		});

		it('should report resource_unavailable when the resource cannot be resolved', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
				resource: 'https://n8n.example.com/mcp/gone',
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(undefined);

			const result = await service.getConsentDetails(sessionToken);

			expect(result).toEqual({ ok: false, reason: 'resource_unavailable' });
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
			expect(userConsentRepository.upsert).not.toHaveBeenCalled();
		});

		it('should handle user approval and generate authorization code', async () => {
			const sessionToken = 'valid-session-token';
			const userId = 'user-123';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: 'state-xyz',
				resource: 'https://n8n.example.com/mcp-server/http',
			};
			const authCode = 'generated-auth-code';

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			const result = await service.handleConsentDecision(sessionToken, userId, true);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).toContain('state=state-xyz');
			expect(userConsentRepository.upsert).toHaveBeenCalledWith(
				{
					userId: 'user-123',
					clientId: 'client-123',
					grantedAt: expect.any(Number),
				},
				['userId', 'clientId'],
			);
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				'state-xyz',
				'https://n8n.example.com/mcp-server/http',
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
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			const result = await service.handleConsentDecision(sessionToken, userId, true);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).not.toContain('state=');
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				undefined,
			);
		});

		it('should handle re-authorization for existing consent by upserting', async () => {
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
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			// First authorization
			await service.handleConsentDecision(sessionToken, userId, true);
			// Re-authorization with same userId + clientId should not throw
			await service.handleConsentDecision(sessionToken, userId, true);

			expect(userConsentRepository.upsert).toHaveBeenCalledTimes(2);
			expect(userConsentRepository.upsert).toHaveBeenCalledWith(
				{
					userId: 'user-123',
					clientId: 'client-123',
					grantedAt: expect.any(Number),
				},
				['userId', 'clientId'],
			);
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
