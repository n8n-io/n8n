'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const active_workflows_service_1 = require('@/services/active-workflows.service');
describe('ActiveWorkflowsService', () => {
	const user = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const sharedWorkflowRepository = (0, jest_mock_extended_1.mock)();
	const workflowFinderService = (0, jest_mock_extended_1.mock)();
	const activationErrorsService = (0, jest_mock_extended_1.mock)();
	const service = new active_workflows_service_1.ActiveWorkflowsService(
		(0, jest_mock_extended_1.mock)(),
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
			await expect(service.getActivationError(workflowId, user)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).not.toHaveBeenCalled();
		});
		it('should return the error when the user has access', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(new db_1.WorkflowEntity());
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
//# sourceMappingURL=active-workflows.service.test.js.map
