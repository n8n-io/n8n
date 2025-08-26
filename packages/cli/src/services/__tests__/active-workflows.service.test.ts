import { WorkflowEntity } from '@n8n/db';
import type { User, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('ActiveWorkflowsService', () => {
	const user = mock<User>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const service = new ActiveWorkflowsService(
		mock(),
		workflowRepository,
		sharedWorkflowRepository,
		activationErrorsService,
		workflowFinderService,
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
			user.role = 'global:admin';
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['2', '3', '4']);
			expect(sharedWorkflowRepository.getSharedWorkflowIds).not.toHaveBeenCalled();
		});

		it('should filter out workflow ids that the user does not have access to', async () => {
			user.role = 'global:member';
			sharedWorkflowRepository.getSharedWorkflowIds.mockResolvedValue(['3']);
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['3']);
			expect(sharedWorkflowRepository.getSharedWorkflowIds).toHaveBeenCalledWith(activeIds);
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
