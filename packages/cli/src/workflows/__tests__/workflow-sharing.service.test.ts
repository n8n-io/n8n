import type { Logger, LicenseState } from '@n8n/backend-common';
import type { ProjectRelationRepository, SharedWorkflowRepository, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { WorkflowSharingService } from '../workflow-sharing.service';

describe('WorkflowSharingService', () => {
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const roleService = mock<RoleService>();
	const licenseState = mock<LicenseState>();
	const userRepository = mock<UserRepository>();
	const logger = mock<Logger>();

	const service = new WorkflowSharingService(
		sharedWorkflowRepository,
		roleService,
		projectRelationRepository,
		licenseState,
		userRepository,
		logger,
	);

	describe('getUserIdsWithAccessToWorkflow', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			roleService.rolesWithScope.mockImplementation(async (namespace) => {
				if (namespace === 'global') return ['global:owner', 'global:admin'];
				if (namespace === 'project') return ['project:editor'];
				return ['workflow:owner', 'workflow:editor'];
			});
		});

		it('resolves projects only through sharing rows whose own role grants workflow:read, then delegates to the repository', async () => {
			sharedWorkflowRepository.findProjectIdsByRole.mockResolvedValue(['project-1', 'project-2']);
			userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['user-1', 'user-2']);

			const result = await service.getUserIdsWithAccessToWorkflow('workflow-1');

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('global', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(sharedWorkflowRepository.findProjectIdsByRole).toHaveBeenCalledWith('workflow-1', [
				'workflow:owner',
				'workflow:editor',
			]);
			expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledWith({
				projectIds: ['project-1', 'project-2'],
				projectRoleSlugs: ['project:editor'],
				globalRoleSlugs: ['global:owner', 'global:admin'],
			});
			expect(result).toEqual(['user-1', 'user-2']);
		});

		it('excludes a project the workflow is only shared into with a role that does not grant workflow:read', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'workflow' ? ['workflow:owner'] : [],
			);
			sharedWorkflowRepository.findProjectIdsByRole.mockResolvedValue([]);
			userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue([]);

			await service.getUserIdsWithAccessToWorkflow('workflow-1');

			expect(sharedWorkflowRepository.findProjectIdsByRole).toHaveBeenCalledWith('workflow-1', [
				'workflow:owner',
			]);
			expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledWith({
				projectIds: [],
				projectRoleSlugs: [],
				globalRoleSlugs: [],
			});
		});

		it('still resolves global-scope recipients when the workflow has no associated projects', async () => {
			sharedWorkflowRepository.findProjectIdsByRole.mockResolvedValue([]);
			userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['owner-1']);

			const result = await service.getUserIdsWithAccessToWorkflow('workflow-1');

			expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledWith({
				projectIds: [],
				projectRoleSlugs: ['project:editor'],
				globalRoleSlugs: ['global:owner', 'global:admin'],
			});
			expect(result).toEqual(['owner-1']);
		});
	});

	describe('getUserIdsWithAccessToWorkflowSafe', () => {
		it('resolves to nobody, rather than throwing, when the lookup fails', async () => {
			sharedWorkflowRepository.findProjectIdsByRole.mockRejectedValue(new Error('db unavailable'));

			const result = await service.getUserIdsWithAccessToWorkflowSafe('workflow-1');

			expect(result).toEqual([]);
			expect(logger.error).toHaveBeenCalled();
		});

		it('otherwise returns the same result as the unsafe lookup', async () => {
			sharedWorkflowRepository.findProjectIdsByRole.mockResolvedValue([]);
			roleService.rolesWithScope.mockResolvedValue([]);
			userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['user-1']);

			const result = await service.getUserIdsWithAccessToWorkflowSafe('workflow-1');

			expect(result).toEqual(['user-1']);
		});
	});
});
