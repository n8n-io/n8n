import type { Logger } from '@n8n/backend-common';
import type { Role, RoleRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import {
	DelegationAuthorizationService,
	type DelegationCheckResult,
} from '../delegation-authorization.service';

const makeRole = (slug: string, scopeSlugs: string[]): Role =>
	mock<Role>({
		slug,
		scopes: scopeSlugs.map((s) => mock({ slug: s })),
	});

const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
const roleRepository = mock<RoleRepository>();
const config = mock<TokenExchangeConfig>({ enforceDelegation: true });

const service = new DelegationAuthorizationService(logger, roleRepository, config);

describe('DelegationAuthorizationService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		config.enforceDelegation = true;
	});

	describe('canDelegate', () => {
		it('should allow when actor scopes are a superset of requested role scopes', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(
					makeRole('project:editor', ['workflow:read', 'workflow:update', 'workflow:create']),
				)
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']));

			const result = await service.canDelegate('project:editor', 'project:viewer');

			expect(result).toEqual<DelegationCheckResult>({ allowed: true, missingScopes: [] });
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should reject when actor scopes are a strict subset of requested role scopes', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']))
				.mockResolvedValueOnce(
					makeRole('project:editor', ['workflow:read', 'workflow:update', 'workflow:create']),
				);

			const result = await service.canDelegate('project:viewer', 'project:editor');

			expect(result.allowed).toBe(false);
			expect(result.missingScopes).toEqual(
				expect.arrayContaining(['workflow:update', 'workflow:create']),
			);
			expect(result.missingScopes).not.toContain('workflow:read');
		});

		it('should include all missing scopes in the rejection result', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('custom:low', ['scope:a']))
				.mockResolvedValueOnce(makeRole('custom:high', ['scope:a', 'scope:b', 'scope:c']));

			const result = await service.canDelegate('custom:low', 'custom:high');

			expect(result.allowed).toBe(false);
			expect(result.missingScopes).toEqual(expect.arrayContaining(['scope:b', 'scope:c']));
			expect(result.missingScopes).toHaveLength(2);
		});

		it('should always emit a warning log when the check would fail, regardless of enforce setting', async () => {
			config.enforceDelegation = false;
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']))
				.mockResolvedValueOnce(makeRole('project:editor', ['workflow:read', 'workflow:update']));

			await service.canDelegate('project:viewer', 'project:editor', 'project-123');

			expect(logger.warn).toHaveBeenCalledWith(
				'Delegation would fail: actor lacks required scopes',
				expect.objectContaining({
					actorRoleSlug: 'project:viewer',
					requestedRoleSlug: 'project:editor',
					resourceId: 'project-123',
					missingScopes: expect.arrayContaining(['workflow:update']),
					enforced: false,
				}),
			);
		});

		it('should allow but still warn when enforceDelegation is false', async () => {
			config.enforceDelegation = false;
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']))
				.mockResolvedValueOnce(makeRole('project:editor', ['workflow:read', 'workflow:update']));

			const result = await service.canDelegate('project:viewer', 'project:editor');

			expect(result.allowed).toBe(true);
			expect(result.missingScopes).toEqual(expect.arrayContaining(['workflow:update']));
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('should work with custom roles with arbitrary scope combinations', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('custom:full', ['scope:x', 'scope:y', 'scope:z']))
				.mockResolvedValueOnce(makeRole('custom:partial', ['scope:x', 'scope:z']));

			const result = await service.canDelegate('custom:full', 'custom:partial');

			expect(result).toEqual<DelegationCheckResult>({ allowed: true, missingScopes: [] });
		});

		it('should treat an unknown actor role slug as having no scopes', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']));

			const result = await service.canDelegate('unknown:role', 'project:viewer');

			expect(result.allowed).toBe(false);
			expect(result.missingScopes).toContain('workflow:read');
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('should allow when the requested role has no scopes', async () => {
			roleRepository.findOne
				.mockResolvedValueOnce(makeRole('project:viewer', ['workflow:read']))
				.mockResolvedValueOnce(makeRole('custom:empty', []));

			const result = await service.canDelegate('project:viewer', 'custom:empty');

			expect(result).toEqual<DelegationCheckResult>({ allowed: true, missingScopes: [] });
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});
});
