import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { TrustedSourceIdentityRepository } from '../database/repositories/trusted-source-identity.repository';
import { TrustedSourceDbGate } from '../trusted-source.gate';

describe('TrustedSourceDbGate', () => {
	const userRepository = mock<UserRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const identityRepository = mock<TrustedSourceIdentityRepository>();
	const gate = new TrustedSourceDbGate(
		mock(),
		userRepository,
		workflowFinderService,
		identityRepository,
	);

	const user = mock<User>({ id: 'user-1', disabled: false });
	const grant = { audiences: ['https://n8n.example/mcp/wf'], executeAccessWorkflowId: 'wf-1' };
	const binding = { sourceId: 'source-1', subject: 'idp-alice' };

	beforeEach(() => {
		vi.clearAllMocks();
		userRepository.findByIdWithRole.mockResolvedValue(user);
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
		identityRepository.findBinding.mockResolvedValue({ userId: 'user-1', status: 'active' });
	});

	describe('without a binding', () => {
		it('allows a user who still holds workflow:execute on the granted workflow', async () => {
			expect(await gate.authorizeSealed({ userId: 'user-1', grant })).toBe(true);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1'],
				user,
				['workflow:execute'],
			);
			expect(identityRepository.findBinding).not.toHaveBeenCalled();
		});

		it('denies a user who no longer exists', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(null);

			expect(await gate.authorizeSealed({ userId: 'user-1', grant })).toBe(false);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('denies a disabled user', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(
				mock<User>({ id: 'user-1', disabled: true }),
			);

			expect(await gate.authorizeSealed({ userId: 'user-1', grant })).toBe(false);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('denies a user who lost workflow:execute on the granted workflow', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());

			expect(await gate.authorizeSealed({ userId: 'user-1', grant })).toBe(false);
		});

		it('allows a grant that names no workflow', async () => {
			expect(
				await gate.authorizeSealed({
					userId: 'user-1',
					grant: { audiences: ['https://n8n.example/mcp/wf'] },
				}),
			).toBe(true);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});
	});

	describe('with a binding', () => {
		it('allows an active binding to the same user', async () => {
			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(true);
			expect(identityRepository.findBinding).toHaveBeenCalledWith('source-1', 'idp-alice');
		});

		it.each(['suspended', 'revoked'] as const)('denies a %s binding', async (status) => {
			identityRepository.findBinding.mockResolvedValue({ userId: 'user-1', status });

			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(false);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('denies a binding that no longer exists', async () => {
			identityRepository.findBinding.mockResolvedValue(null);

			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(false);
		});

		it('denies an active binding that now points at a different user', async () => {
			identityRepository.findBinding.mockResolvedValue({ userId: 'user-2', status: 'active' });

			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(false);
		});

		it('still denies an active binding when the user lost workflow:execute', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());

			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(false);
		});

		it('denies a disabled user without reading the binding', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(null);

			expect(await gate.authorizeSealed({ userId: 'user-1', grant, binding })).toBe(false);
			expect(identityRepository.findBinding).not.toHaveBeenCalled();
		});
	});
});
