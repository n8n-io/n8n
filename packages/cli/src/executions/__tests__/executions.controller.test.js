'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const executions_controller_1 = require('@/executions/executions.controller');
describe('ExecutionsController', () => {
	const executionService = (0, jest_mock_extended_1.mock)();
	const workflowSharingService = (0, jest_mock_extended_1.mock)();
	const executionsController = new executions_controller_1.ExecutionsController(
		(0, jest_mock_extended_1.mock)(),
		executionService,
		(0, jest_mock_extended_1.mock)(),
		workflowSharingService,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getOne', () => {
		it('should 400 when execution is not a number', async () => {
			const req = (0, jest_mock_extended_1.mock)({ params: { id: 'test' } });
			await expect(executionsController.getOne(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
	});
	describe('getMany', () => {
		const NO_EXECUTIONS = { count: 0, estimated: false, results: [] };
		const QUERIES_WITH_EITHER_STATUS_OR_RANGE = [
			{
				kind: 'range',
				workflowId: undefined,
				status: undefined,
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: ['waiting'],
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
		];
		const QUERIES_NEITHER_STATUS_NOR_RANGE_PROVIDED = [
			{
				kind: 'range',
				workflowId: undefined,
				status: undefined,
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
		];
		executionService.findRangeWithCount.mockResolvedValue(NO_EXECUTIONS);
		describe('if either status or range provided', () => {
			test.each(QUERIES_WITH_EITHER_STATUS_OR_RANGE)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);
					const req = (0, jest_mock_extended_1.mock)({ rangeQuery });
					await executionsController.getMany(req);
					expect(executionService.findLatestCurrentAndCompleted).not.toHaveBeenCalled();
					expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
				},
			);
		});
		describe('if neither status nor range provided', () => {
			test.each(QUERIES_NEITHER_STATUS_NOR_RANGE_PROVIDED)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);
					const req = (0, jest_mock_extended_1.mock)({ rangeQuery });
					await executionsController.getMany(req);
					expect(executionService.findLatestCurrentAndCompleted).toHaveBeenCalled();
					expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
				},
			);
		});
		describe('if both status and range provided', () => {
			it('should fetch executions per query', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
				executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);
				const rangeQuery = {
					kind: 'range',
					workflowId: undefined,
					status: ['success'],
					range: { lastId: '999', firstId: '111', limit: 5 },
				};
				const req = (0, jest_mock_extended_1.mock)({ rangeQuery });
				await executionsController.getMany(req);
				expect(executionService.findLatestCurrentAndCompleted).not.toHaveBeenCalled();
				expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
			});
		});
	});
	describe('stop', () => {
		const executionId = '999';
		const req = (0, jest_mock_extended_1.mock)({ params: { id: executionId } });
		it('should throw expected NotFoundError when all workflows are inaccessible for user', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			const promise = executionsController.stop(req);
			await expect(promise).rejects.toThrow(not_found_error_1.NotFoundError);
			expect(executionService.stop).not.toHaveBeenCalled();
		});
		it('should call execution service with expected data when user has accessible workflows', async () => {
			const mockAccessibleWorkflowIds = ['1234', '999'];
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(mockAccessibleWorkflowIds);
			await executionsController.stop(req);
			expect(executionService.stop).toHaveBeenCalledWith(req.params.id, mockAccessibleWorkflowIds);
		});
	});
});
//# sourceMappingURL=executions.controller.test.js.map
