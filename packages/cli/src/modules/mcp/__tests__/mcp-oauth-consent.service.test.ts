import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
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
let projectRepository: jest.Mocked<ProjectRepository>;
let service: McpOAuthConsentService;

// Granted scopes default to the MCP tool scopes when a session requests no scopes.
const DEFAULT_GRANTED_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
const user = mock<User>({ id: 'user-123' });

// A user whose global role grants the given scopes.
const userWithScopes = (globalSlugs: string[]) =>
	mock<User>({ id: 'user-123', role: { scopes: globalSlugs.map((slug) => ({ slug })) } as never });

// Stub the project-membership scope query to return the given scope slugs.
const mockProjectScopes = (slugs: string[]) => {
	const qb = {
		innerJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		distinct: jest.fn().mockReturnThis(),
		getRawMany: jest.fn().mockResolvedValue(slugs.map((slug) => ({ slug }))),
	};
	projectRepository.createQueryBuilder.mockReturnValue(qb as never);
};

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
		projectRepository = mockInstance(ProjectRepository) as jest.Mocked<ProjectRepository>;

		service = new McpOAuthConsentService(
			logger,
			oauthSessionService,
			oauthClientRepository,
			userConsentRepository,
			authorizationCodeService,
			projectRepository,
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
				scopes: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
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
				scopes: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
			});
		});
	});

	describe('handleConsentDecision', () => {
		it('should handle user denial', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: 'state-xyz',
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);

			const result = await service.handleConsentDecision(sessionToken, user, false);

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

			const result = await service.handleConsentDecision(sessionToken, user, true);

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
				DEFAULT_GRANTED_SCOPES,
				'https://n8n.example.com/mcp-server/http',
			);
			expect(logger.info).toHaveBeenCalledWith('Consent approved', {
				clientId: 'client-123',
				userId: 'user-123',
				grantedScopes: DEFAULT_GRANTED_SCOPES,
			});
		});

		it('should handle approval without state parameter', async () => {
			const sessionToken = 'valid-session-token';
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

			const result = await service.handleConsentDecision(sessionToken, user, true);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).not.toContain('state=');
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				DEFAULT_GRANTED_SCOPES,
				undefined,
			);
		});

		it('should handle re-authorization for existing consent by upserting', async () => {
			const sessionToken = 'valid-session-token';
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
			await service.handleConsentDecision(sessionToken, user, true);
			// Re-authorization with same userId + clientId should not throw
			await service.handleConsentDecision(sessionToken, user, true);

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

			oauthSessionService.verifySession.mockImplementation(() => {
				throw new Error('Invalid session');
			});

			await expect(service.handleConsentDecision(sessionToken, user, true)).rejects.toThrow(
				'Invalid or expired session',
			);
		});

		it('should handle denial without state parameter', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);

			const result = await service.handleConsentDecision(sessionToken, user, false);

			expect(result.redirectUrl).toContain('error=access_denied');
			expect(result.redirectUrl).not.toContain('state=');
		});

		it('downscopes requested n8n scopes to what the user actually holds (global ∪ project)', async () => {
			const sessionToken = 'valid-session-token';
			const scopedUser = userWithScopes(['instanceAi:message']); // global role scope
			mockProjectScopes(['workflow:execute']); // scope held via a project membership
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
				scopes: ['instanceAi:message', 'workflow:execute', 'workflow:read'],
			});
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue('code');

			await service.handleConsentDecision(sessionToken, scopedUser, true);

			// workflow:read is dropped — the user holds it nowhere.
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				['instanceAi:message', 'workflow:execute'],
				undefined,
			);
		});

		it('passes non-RBAC tool scopes through and drops unheld n8n scopes', async () => {
			const sessionToken = 'valid-session-token';
			const scopedUser = userWithScopes([]); // no global scopes
			mockProjectScopes([]); // no project scopes
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
				scopes: ['tool:listWorkflows', 'workflow:read'],
			});
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue('code');

			await service.handleConsentDecision(sessionToken, scopedUser, true);

			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				['tool:listWorkflows'],
				undefined,
			);
		});
	});
});
