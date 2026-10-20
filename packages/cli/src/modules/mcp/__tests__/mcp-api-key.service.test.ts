import type { Mocked } from 'vitest';
import type { ApiKeyRepository, User, TokenGrant } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AuthStrategyRegistry } from '@n8n/backend-services/auth';
import type { JwtService } from '@n8n/backend-services';

import { McpServerApiKeyService } from '../mcp-api-key.service';

const makeUser = (id: string): User => ({ ...mock<User>(), id });

describe('McpServerApiKeyService', () => {
	let authStrategyRegistry: Mocked<AuthStrategyRegistry>;
	let service: McpServerApiKeyService;
	// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
	let apiKeys: Mocked<ApiKeyRepository>;
	// EOF Experiment cleanup

	beforeEach(() => {
		authStrategyRegistry = mock<AuthStrategyRegistry>();
		// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
		apiKeys = mock<ApiKeyRepository>();
		// EOF Experiment cleanup
		// Experiment cleanup (123_surface_mcp_to_claude_trial_users): replace apiKeys with mock<ApiKeyRepository>(); keep the service.
		service = new McpServerApiKeyService(apiKeys, mock<JwtService>(), authStrategyRegistry);
	});

	describe('verifyApiKey', () => {
		it('delegates to the registry with audience=mcp-server-api and maps the grant to UserWithContext', async () => {
			const subject = makeUser('subject-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValue({
				subject,
				scopes: [],
			} satisfies TokenGrant);

			const result = await service.verifyApiKey('any-token');

			expect(authStrategyRegistry.buildContextFromToken).toHaveBeenCalledWith('any-token', {
				audience: 'mcp-server-api',
			});
			expect(result?.user).toBe(subject);
			expect(result?.actor).toBeUndefined();
		});

		it('returns the actor as user when delegation is present', async () => {
			const subject = makeUser('subject-1');
			const actor = makeUser('actor-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValue({
				subject,
				actor,
				scopes: [],
			} satisfies TokenGrant);

			const result = await service.verifyApiKey('token');

			expect(result?.user).toBe(actor);
			expect(result?.actor).toBe(actor);
		});

		it('reports `api_key` for a delegated token-exchange grant, not a distinct type', async () => {
			// Deliberate: `api_key` covers every non-OAuth bearer token the strategy
			// chain admits, scoped JWTs included, matching what the MCP connection
			// telemetry has reported for them since they were accepted here.
			const subject = makeUser('subject-1');
			const actor = makeUser('actor-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValue({
				subject,
				actor,
				scopes: [],
			} satisfies TokenGrant);

			const result = await service.verifyApiKey('scoped-jwt');

			expect(result?.caller).toEqual({ authType: 'api_key' });
		});

		// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
		it('passes only the verified stored key ID for connection tracking', async () => {
			const subject = makeUser('subject-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValue({
				subject,
				scopes: [],
				apiKeyId: 'key-1',
			});
			const result = await service.verifyApiKey('secret-key');
			expect(result?.caller).toEqual({ authType: 'api_key', apiKeyId: 'key-1' });
			expect(apiKeys.findOne).not.toHaveBeenCalled();
		});

		it('does not look up a key for a scoped JWT grant', async () => {
			const subject = makeUser('subject-1');
			const actor = makeUser('actor-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValue({ subject, actor, scopes: [] });
			const result = await service.verifyApiKey('scoped-jwt');
			expect(result?.user).toBe(actor);
			expect(result?.caller).toEqual({ authType: 'api_key' });
			expect(apiKeys.findOne).not.toHaveBeenCalled();
		});
		// EOF Experiment cleanup

		it('reports which strategy admitted the caller, for the log line', async () => {
			const subject = makeUser('subject-1');
			authStrategyRegistry.buildContextFromToken.mockResolvedValueOnce({
				subject,
				scopes: [],
				apiKeyId: 'key-1',
			} satisfies TokenGrant);
			authStrategyRegistry.buildContextFromToken.mockResolvedValueOnce({
				subject,
				scopes: [],
			} satisfies TokenGrant);

			expect((await service.verifyApiKey('api-key'))?.authMethod).toBe('api-key');
			expect((await service.verifyApiKey('scoped-jwt'))?.authMethod).toBe('scoped-jwt');
		});

		it('abstains when no strategy knows the token', async () => {
			authStrategyRegistry.buildContextFromToken.mockResolvedValue(null);

			expect(await service.verifyApiKey('unknown-token')).toBeNull();
		});

		it('returns a rejection context when a strategy refuses the token', async () => {
			authStrategyRegistry.buildContextFromToken.mockResolvedValue(false);

			const result = await service.verifyApiKey('bad-token');

			expect(result?.user).toBeNull();
			expect(result?.context).toEqual({ reason: 'invalid_token', auth_type: 'api_key' });
		});

		it.each([
			['JsonWebTokenError', 'invalid_token' as const, 'jwt malformed'],
			['Error', 'unknown_error' as const, 'boom'],
		])('maps %s thrown by a strategy to reason=%s', async (name, reason, message) => {
			const error = Object.assign(new Error(message), { name });
			authStrategyRegistry.buildContextFromToken.mockRejectedValue(error);

			const result = await service.verifyApiKey('token');

			expect(result?.user).toBeNull();
			expect(result?.context).toEqual({
				reason,
				auth_type: 'api_key',
				error_details: message,
			});
		});
	});
});
