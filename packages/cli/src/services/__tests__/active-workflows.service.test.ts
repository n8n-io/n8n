import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, WorkflowEntity } from '@n8n/db';
import type { User, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { ProjectScopeService } from '@/permissions.ee/project-scope.service';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('ActiveWorkflowsService', () => {
	const user = mock<User>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const projectScopeService = mock<ProjectScopeService>();
	const service = new ActiveWorkflowsService(
		mock(),
		workflowRepository,
		sharedWorkflowRepository,
		activationErrorsService,
		workflowFinderService,
		projectScopeService,
	);
	const activeIds = ['1', '2', '3', '4'];

	beforeEach(() => vi.clearAllMocks());

	describe('getAllActiveIdsInStorage', () => {
		it('should filter out any workflow ids that have activation errors', async () => {
			activationErrorsService.getAll.mockResolvedValue({ 1: 'some error' });
			workflowRepository.getActiveIds.mockResolvedValue(activeIds);

			const ids = await service.getAllActiveIdsInStorage();
			expect(ids).toEqual(['2', '3', '4']);
		});
	});

	describe('getAllActiveIdsFor', () => {
		beforeEach(() => {
			activationErrorsService.getAll.mockResolvedValue({ 1: 'some error' });
			workflowRepository.getActiveIds.mockResolvedValue(activeIds);
		});

		it('should return all workflow ids when the user can list workflows globally', async () => {
			user.role = GLOBAL_ADMIN_ROLE;
			projectScopeService.getProjectRoleSlugs.mockResolvedValue(null);
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['2', '3', '4']);
			expect(projectScopeService.getProjectRoleSlugs).toHaveBeenCalledWith(user, ['workflow:list']);
			expect(sharedWorkflowRepository.findWorkflowIdsInUserProjects).not.toHaveBeenCalled();
		});

		it('should filter out workflow ids that the user cannot list', async () => {
			user.role = GLOBAL_MEMBER_ROLE;
			user.id = 'user-1';
			projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:admin']);
			sharedWorkflowRepository.findWorkflowIdsInUserProjects.mockResolvedValue(new Set(['3']));
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['3']);
			expect(projectScopeService.getProjectRoleSlugs).toHaveBeenCalledWith(user, ['workflow:list']);
			expect(sharedWorkflowRepository.findWorkflowIdsInUserProjects).toHaveBeenCalledWith(
				activeIds,
				'user-1',
				['project:admin'],
			);
		});

		it('should return no ids when the user cannot list workflows in any project', async () => {
			user.role = GLOBAL_MEMBER_ROLE;
			projectScopeService.getProjectRoleSlugs.mockResolvedValue([]);
			sharedWorkflowRepository.findWorkflowIdsInUserProjects.mockResolvedValue(new Set());
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual([]);
		});
	});

	describe('getActivationError', () => {
		const workflowId = 'workflowId';

		it('should throw a BadRequestError a user does not have access to the workflow id', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			await expect(service.getActivationError(workflowId, user)).rejects.toThrow(BadRequestError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).not.toHaveBeenCalled();
		});

		it('should return the error when the user has access', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(new WorkflowEntity());
			activationErrorsService.get.mockResolvedValue('some-error');
			const error = await service.getActivationError(workflowId, user);

			expect(error).toEqual('some-error');
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).toHaveBeenCalledWith(workflowId);
		});
	});
});
