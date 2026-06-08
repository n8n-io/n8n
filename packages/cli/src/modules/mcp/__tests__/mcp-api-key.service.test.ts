import type { ApiKeyRepository, UserRepository, User, TokenGrant } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { JwtService } from '@/services/jwt.service';

import type { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { McpServerApiKeyService } from '../mcp-api-key.service';

const makeUser = (id: string): User => ({ ...mock<User>(), id });

describe('McpServerApiKeyService', () => {
	let authStrategyRegistry: jest.Mocked<AuthStrategyRegistry>;
	let service: McpServerApiKeyService;

	beforeEach(() => {
		authStrategyRegistry = mock<AuthStrategyRegistry>();
		service = new McpServerApiKeyService(
			mock<ApiKeyRepository>(),
			mock<JwtService>(),
			mock<UserRepository>(),
			mock<AccessTokenRepository>(),
			authStrategyRegistry,
		);
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
			expect(result.user).toBe(subject);
			expect(result.actor).toBeUndefined();
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

			expect(result.user).toBe(actor);
			expect(result.actor).toBe(actor);
		});

		it('returns a rejection context when the registry returns null', async () => {
			authStrategyRegistry.buildContextFromToken.mockResolvedValue(null);

			const result = await service.verifyApiKey('bad-token');

			expect(result.user).toBeNull();
			expect(result.context).toEqual({ reason: 'invalid_token', auth_type: 'api_key' });
		});

		it.each([
			['JsonWebTokenError', 'invalid_token' as const, 'jwt malformed'],
			['Error', 'unknown_error' as const, 'boom'],
		])('maps %s thrown by a strategy to reason=%s', async (name, reason, message) => {
			const error = Object.assign(new Error(message), { name });
			authStrategyRegistry.buildContextFromToken.mockRejectedValue(error);

			const result = await service.verifyApiKey('token');

			expect(result.user).toBeNull();
			expect(result.context).toEqual({
				reason,
				auth_type: 'api_key',
				error_details: message,
			});
		});
	});
});
