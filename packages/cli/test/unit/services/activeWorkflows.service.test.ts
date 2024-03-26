import type { ActivationErrorsService } from '@/ActivationErrors.service';
import type { User } from '@db/entities/User';
import type { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { WorkflowRepository } from '@db/repositories/workflow.repository';
import { ActiveWorkflowsService } from '@/services/activeWorkflows.service';
import { mock } from 'jest-mock-extended';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

describe('ActiveWorkflowsService', () => {
	const user = mock<User>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const service = new ActiveWorkflowsService(
		mock(),
		workflowRepository,
		sharedWorkflowRepository,
		activationErrorsService,
	);
	const activeIds = ['1', '2', '3', '4'];

	beforeEach(() => jest.clearAllMocks());

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

		it('should return all workflow ids when user has full access', async () => {
			user.hasGlobalScope.mockReturnValue(true);
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['2', '3', '4']);
			expect(user.hasGlobalScope).toHaveBeenCalledWith('workflow:list');
			expect(sharedWorkflowRepository.getSharedWorkflowIds).not.toHaveBeenCalled();
		});

		it('should filter out workflow ids that the user does not have access to', async () => {
			user.hasGlobalScope.mockReturnValue(false);
			sharedWorkflowRepository.getSharedWorkflowIds.mockResolvedValue(['3']);
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['3']);
			expect(user.hasGlobalScope).toHaveBeenCalledWith('workflow:list');
			expect(sharedWorkflowRepository.getSharedWorkflowIds).toHaveBeenCalledWith(activeIds);
		});
	});

	describe('getActivationError', () => {
		const workflowId = 'workflowId';

		it('should throw a BadRequestError a user does not have access to the workflow id', async () => {
			sharedWorkflowRepository.findWorkflowForUser.mockResolvedValue(null);
			await expect(service.getActivationError(workflowId, user)).rejects.toThrow(BadRequestError);

			expect(sharedWorkflowRepository.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).not.toHaveBeenCalled();
		});

		it('should return the error when the user has access', async () => {
			sharedWorkflowRepository.findWorkflowForUser.mockResolvedValue(new WorkflowEntity());
			activationErrorsService.get.mockResolvedValue('some-error');
			const error = await service.getActivationError(workflowId, user);

			expect(error).toEqual('some-error');
			expect(sharedWorkflowRepository.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).toHaveBeenCalledWith(workflowId);
		});
	});
});
