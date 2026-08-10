import type { Mocked } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { mock } from 'vitest-mock-extended';

import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { OAuthConsentService } from '../oauth-consent.service';
import { OAuth2FlowService } from '../oauth-flow.service';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { OAuthSessionService } from '../oauth-session.service';
import type { UserConsent } from '../database/entities/oauth-user-consent.entity';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';
import {
	ProtectedResourceRegistry,
	type ProtectedResource,
} from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

const issuer = 'https://n8n.example.com';

const INSTANCE_SCOPES = ['workflow:read', 'workflow:write', 'execution:read'];

// plain object: vitest-mock-extended wraps array overrides in proxies,
// which breaks equality assertions on `scopes`
const instanceResource = {
	scopes: INSTANCE_SCOPES,
	authorize: async () => true,
} as unknown as ProtectedResource;

let logger: Mocked<Logger>;
let oauthSessionService: Mocked<OAuthSessionService>;
let oauthClientRepository: Mocked<OAuthClientRepository>;
let userConsentRepository: Mocked<UserConsentRepository>;
let authorizationCodeService: Mocked<OAuthAuthorizationCodeService>;
let protectedResourceRegistry: Mocked<ProtectedResourceRegistry>;
let urlService: Mocked<UrlService>;
let oauth2FlowService: Mocked<OAuth2FlowService>;
let service: OAuthConsentService;

describe('OAuthConsentService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		oauthSessionService = mockInstance(OAuthSessionService) as Mocked<OAuthSessionService>;
		oauthClientRepository = mockInstance(OAuthClientRepository) as Mocked<OAuthClientRepository>;
		userConsentRepository = mockInstance(UserConsentRepository) as Mocked<UserConsentRepository>;
		authorizationCodeService = mockInstance(OAuthAuthorizationCodeService);
		protectedResourceRegistry = mockInstance(
			ProtectedResourceRegistry,
		) as Mocked<ProtectedResourceRegistry>;
		urlService = mockInstance(UrlService) as Mocked<UrlService>;
		oauth2FlowService = mockInstance(OAuth2FlowService) as Mocked<OAuth2FlowService>;

		service = new OAuthConsentService(
			logger,
			oauthSessionService,
			oauthClientRepository,
			userConsentRepository,
			authorizationCodeService,
			protectedResourceRegistry,
			urlService,
			oauth2FlowService,
		);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue(issuer);
		protectedResourceRegistry.getDefaultResource.mockReturnValue(instanceResource);
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

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				scopes: INSTANCE_SCOPES,
				previousScopes: undefined,
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

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toBeNull();
		});

		it('should return null and log error when session verification fails', async () => {
			const sessionToken = 'invalid-session-token';

			oauthSessionService.verifySession.mockImplementation(() => {
				throw new Error('Invalid session');
			});

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

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

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				scopes: INSTANCE_SCOPES,
				previousScopes: undefined,
			});
		});

		it('should include the resource scope-tools mapping when available', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });
			const scopeTools = { 'workflow:read': ['search_workflows', 'get_workflow_details'] };

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);
			protectedResourceRegistry.getDefaultResource.mockReturnValue({
				scopes: INSTANCE_SCOPES,
				getScopeTools: () => scopeTools,
			} as unknown as ProtectedResource);

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toMatchObject({ ok: true, scopeTools });
		});

		it('should cap the grantable scopes at what the client requested', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
				requestedScopes: ['workflow:read', 'execution:read'],
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toMatchObject({
				ok: true,
				scopes: ['workflow:read', 'execution:read'],
			});
		});

		it('should preselect the scopes from a previous grant', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				state: null,
			};
			const client = mock<OAuthClient>({ id: 'client-123', name: 'Test Client' });

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(client);
			userConsentRepository.findOneBy.mockResolvedValueOnce({
				scope: ['workflow:read', 'no-longer-supported:scope'],
			} as unknown as UserConsent);

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(userConsentRepository.findOneBy).toHaveBeenCalledWith({
				userId: 'user-1',
				clientId: 'client-123',
			});
			// stale scopes from the previous grant are dropped
			expect(result).toMatchObject({ ok: true, previousScopes: ['workflow:read'] });
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
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue({
				displayName: 'My Workflow',
				scopes: [],
				authorize: async () => true,
			} as unknown as ProtectedResource);

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				resourceName: 'My Workflow',
				redirectUri: 'https://example.com/callback',
				scopes: [],
				previousScopes: undefined,
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
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue({
				id: 'instance-mcp',
				displayName: undefined,
				scopes: INSTANCE_SCOPES,
				authorize: async () => true,
			} as unknown as ProtectedResource);

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toEqual({
				ok: true,
				clientName: 'Test Client',
				clientId: 'client-123',
				resourceName: undefined,
				redirectUri: 'https://example.com/callback',
				scopes: INSTANCE_SCOPES,
				previousScopes: undefined,
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

			const result = await service.getConsentDetails(sessionToken, mock<User>({ id: 'user-1' }));

			expect(result).toEqual({ ok: false, reason: 'resource_unavailable' });
		});
	});

	// A first-party trigger (form, webhook) re-runs the whole flow on every visit, so
	// an unchanged grant is re-approved without showing the screen — but only when a
	// human navigated there, since the screen is what otherwise stops a scripted
	// cross-site navigation from running a workflow as the logged-in user.
	describe('getConsentDetails silent approval', () => {
		const TRIGGER_URL = 'https://n8n.example.com/webhook/abc?method=GET';
		const sessionPayload = {
			clientId: TRIGGER_URL,
			redirectUri: TRIGGER_URL,
			codeChallenge: 'challenge',
			state: 'flow-state-1',
			resource: TRIGGER_URL,
		};

		const firstPartyResource = (scopes: string[] = []) =>
			({
				displayName: 'My Workflow',
				scopes,
				isFirstParty: true,
				authorize: async () => true,
			}) as unknown as ProtectedResource;

		const consentGranted = (scope: string[] = [], ageMs = 0) =>
			mock<UserConsent>({ scope, grantedAt: Date.now() - ageMs });

		beforeEach(() => {
			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			oauthClientRepository.findOne.mockResolvedValue(
				mock<OAuthClient>({ id: TRIGGER_URL, name: 'My Workflow' }),
			);
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(firstPartyResource());
			oauth2FlowService.getNavigationIntent.mockResolvedValue('user-navigation');
			userConsentRepository.findOneBy.mockResolvedValue(consentGranted());
		});

		const detailsFor = async () =>
			await service.getConsentDetails('session-token', mock<User>({ id: 'user-1' }));

		it('should approve silently when the same consent was already granted', async () => {
			expect(await detailsFor()).toMatchObject({ ok: true, silentApproval: true });
			expect(oauth2FlowService.getNavigationIntent).toHaveBeenCalledWith('flow-state-1');
			expect(userConsentRepository.findOneBy).toHaveBeenCalledWith({
				userId: 'user-1',
				clientId: TRIGGER_URL,
			});
		});

		it('should prompt when the flow was not started by a user navigation', async () => {
			oauth2FlowService.getNavigationIntent.mockResolvedValue('unknown');

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
		});

		// An expired flow or a third-party client's own `state` resolves to no intent.
		it('should prompt when the flow has no recorded intent', async () => {
			oauth2FlowService.getNavigationIntent.mockResolvedValue(undefined);

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
		});

		it('should prompt when the resource is not first-party', async () => {
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue({
				scopes: [],
				authorize: async () => true,
			} as unknown as ProtectedResource);

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
			expect(oauth2FlowService.getNavigationIntent).not.toHaveBeenCalled();
		});

		it('should prompt on the first visit, when no consent exists yet', async () => {
			userConsentRepository.findOneBy.mockResolvedValue(null);

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
		});

		it('should prompt when the grant is older than the silent-approval window', async () => {
			userConsentRepository.findOneBy.mockResolvedValue(
				consentGranted([], 31 * 24 * 60 * 60 * 1000),
			);

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
		});

		it('should prompt when a scope is now grantable that was not granted before', async () => {
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(
				firstPartyResource(['workflow:read', 'workflow:write']),
			);
			userConsentRepository.findOneBy.mockResolvedValue(consentGranted(['workflow:read']));

			expect(await detailsFor()).not.toHaveProperty('silentApproval');
		});

		it('should approve silently when every grantable scope was already granted', async () => {
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(
				firstPartyResource(['workflow:read']),
			);
			userConsentRepository.findOneBy.mockResolvedValue(
				consentGranted(['workflow:read', 'workflow:write']),
			);

			expect(await detailsFor()).toMatchObject({ silentApproval: true });
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

			const result = await service.handleConsentDecision(
				sessionToken,
				mock<User>({ id: userId }),
				false,
			);

			expect(result.redirectUrl).toContain('error=access_denied');
			expect(result.redirectUrl).toContain(
				'error_description=User+denied+the+authorization+request',
			);
			expect(result.redirectUrl).toContain('state=state-xyz');
			expect(new URL(result.redirectUrl).searchParams.get('iss')).toBe(issuer);
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
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(instanceResource);
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue(authCode);

			const result = await service.handleConsentDecision(
				sessionToken,
				mock<User>({ id: userId }),
				true,
				['workflow:read'],
			);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).toContain('state=state-xyz');
			expect(new URL(result.redirectUrl).searchParams.get('iss')).toBe(issuer);
			expect(userConsentRepository.upsert).toHaveBeenCalledWith(
				{
					userId: 'user-123',
					clientId: 'client-123',
					grantedAt: expect.any(Number),
					scope: ['workflow:read'],
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
				['workflow:read'],
			);
			expect(logger.info).toHaveBeenCalledWith('Consent approved', {
				clientId: 'client-123',
				userId: 'user-123',
			});
		});

		it('should reject approval without any granted scopes', async () => {
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
			});

			await expect(
				service.handleConsentDecision('token', mock<User>({ id: 'user-123' }), true),
			).rejects.toThrow('At least one scope must be granted');
			await expect(
				service.handleConsentDecision('token', mock<User>({ id: 'user-123' }), true, []),
			).rejects.toThrow('At least one scope must be granted');
			expect(userConsentRepository.upsert).not.toHaveBeenCalled();
		});

		it('should reject scopes the resource does not support', async () => {
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
			});

			await expect(
				service.handleConsentDecision('token', mock<User>({ id: 'user-123' }), true, [
					'workflow:read',
					'admin:all',
				]),
			).rejects.toThrow('Scopes cannot be granted: admin:all');
			expect(userConsentRepository.upsert).not.toHaveBeenCalled();
		});

		it('should reject scopes beyond what the client requested', async () => {
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
				requestedScopes: ['workflow:read'],
			});

			await expect(
				service.handleConsentDecision('token', mock<User>({ id: 'user-123' }), true, [
					'workflow:read',
					'workflow:write',
				]),
			).rejects.toThrow('Scopes cannot be granted: workflow:write');
			expect(userConsentRepository.upsert).not.toHaveBeenCalled();
		});

		it('should force an empty grant for resources without grantable scopes', async () => {
			oauthSessionService.verifySession.mockReturnValue({
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: null,
				resource: 'https://n8n.example.com/mcp/wf-123',
			});
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue({
				displayName: 'My Workflow',
				scopes: [],
				authorize: async () => true,
			} as unknown as ProtectedResource);
			userConsentRepository.upsert.mockResolvedValue(mock());
			authorizationCodeService.createAuthorizationCode.mockResolvedValue('code');

			await service.handleConsentDecision('token', mock<User>({ id: 'user-123' }), true, [
				'workflow:read',
			]);

			expect(userConsentRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ scope: [] }),
				['userId', 'clientId'],
			);
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				'https://n8n.example.com/mcp/wf-123',
				[],
			);
		});

		it('should throw ForbiddenError when the user is not authorized for the resource', async () => {
			const sessionToken = 'valid-session-token';
			const sessionPayload = {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-abc',
				state: 'state-xyz',
				resource: 'https://n8n.example.com/mcp-server/http',
			};

			oauthSessionService.verifySession.mockReturnValue(sessionPayload);
			protectedResourceRegistry.getByResourceUrl.mockResolvedValue(
				mock<ProtectedResource>({ authorize: async () => false }),
			);

			await expect(
				service.handleConsentDecision(sessionToken, mock<User>({ id: 'user-123' }), true),
			).rejects.toThrow(ForbiddenError);

			expect(userConsentRepository.upsert).not.toHaveBeenCalled();
			expect(authorizationCodeService.createAuthorizationCode).not.toHaveBeenCalled();
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

			const result = await service.handleConsentDecision(
				sessionToken,
				mock<User>({ id: userId }),
				true,
				['workflow:read'],
			);

			expect(result.redirectUrl).toContain('code=generated-auth-code');
			expect(result.redirectUrl).not.toContain('state=');
			expect(authorizationCodeService.createAuthorizationCode).toHaveBeenCalledWith(
				'client-123',
				'user-123',
				'https://example.com/callback',
				'challenge-abc',
				null,
				undefined,
				['workflow:read'],
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
			await service.handleConsentDecision(sessionToken, mock<User>({ id: userId }), true, [
				'workflow:read',
			]);
			// Re-authorization with same userId + clientId should not throw
			await service.handleConsentDecision(sessionToken, mock<User>({ id: userId }), true, [
				'workflow:write',
			]);

			expect(userConsentRepository.upsert).toHaveBeenCalledTimes(2);
			expect(userConsentRepository.upsert).toHaveBeenLastCalledWith(
				{
					userId: 'user-123',
					clientId: 'client-123',
					grantedAt: expect.any(Number),
					scope: ['workflow:write'],
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

			await expect(
				service.handleConsentDecision(sessionToken, mock<User>({ id: userId }), true),
			).rejects.toThrow('Invalid or expired session');
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

			const result = await service.handleConsentDecision(
				sessionToken,
				mock<User>({ id: userId }),
				false,
			);

			expect(result.redirectUrl).toContain('error=access_denied');
			expect(result.redirectUrl).not.toContain('state=');
		});
	});
});
