import type { Logger, LicenseState } from '@n8n/backend-common';
import type {
	ProjectRelationRepository,
	SharedWorkflowRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '../role.service';
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
	const globalUser: User = mock<User>({
		id: 'global-user',
		role: { scopes: [{ slug: 'workflow:read' }] },
	});
	const member: User = mock<User>({ id: 'member', role: { scopes: [] } });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSharedWorkflowIds', () => {
		it('returns project workflows directly for users with global access', async () => {
			sharedWorkflowRepository.findWorkflowIdsForGlobalAccess.mockResolvedValue(['workflow-1']);

			const result = await service.getSharedWorkflowIds(globalUser, {
				scopes: ['workflow:read'],
				projectId: 'project-1',
			});

			expect(sharedWorkflowRepository.findWorkflowIdsForGlobalAccess).toHaveBeenCalledWith(
				'project-1',
			);
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(result).toEqual(['workflow-1']);
		});

		it('resolves roles before querying workflows for other users', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:viewer'] : ['workflow:owner'],
			);
			sharedWorkflowRepository.findWorkflowIdsAccessibleToUser.mockResolvedValue(['workflow-1']);

			const result = await service.getSharedWorkflowIds(member, {
				scopes: ['workflow:read'],
			});

			expect(sharedWorkflowRepository.findWorkflowIdsAccessibleToUser).toHaveBeenCalledWith(
				member.id,
				['workflow:owner'],
				['project:viewer'],
			);
			expect(result).toEqual(['workflow-1']);
		});
	});

	it('gets workflow IDs shared with the user from the repository', async () => {
		sharedWorkflowRepository.findWorkflowIdsSharedWithUser.mockResolvedValue(['workflow-1']);

		await expect(service.getSharedWithMeIds(member)).resolves.toEqual(['workflow-1']);
		expect(sharedWorkflowRepository.findWorkflowIdsSharedWithUser).toHaveBeenCalledWith(member.id);
	});

	it('gets workflow IDs owned in the personal project from the repository', async () => {
		sharedWorkflowRepository.findOwnedWorkflowIdsInPersonalProject.mockResolvedValue([
			'workflow-1',
		]);

		await expect(service.getOwnedWorkflowsInPersonalProject(member.id)).resolves.toEqual([
			'workflow-1',
		]);
		expect(sharedWorkflowRepository.findOwnedWorkflowIdsInPersonalProject).toHaveBeenCalledWith(
			member.id,
		);
	});

	describe('getUserIdsWithAccessToWorkflow', () => {
		beforeEach(() => {
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
