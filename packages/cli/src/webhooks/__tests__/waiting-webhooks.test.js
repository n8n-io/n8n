'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const conflict_error_1 = require('@/errors/response-errors/conflict.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const waiting_webhooks_1 = require('@/webhooks/waiting-webhooks');
describe('WaitingWebhooks', () => {
	const executionRepository = (0, jest_mock_extended_1.mock)();
	const waitingWebhooks = new waiting_webhooks_1.WaitingWebhooks(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		executionRepository,
		(0, jest_mock_extended_1.mock)(),
	);
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	it('should throw NotFoundError if there is no execution to resume', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(undefined);
		const promise = waitingWebhooks.executeWebhook(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
		await expect(promise).rejects.toThrowError(not_found_error_1.NotFoundError);
	});
	it('should throw ConflictError if the execution to resume is already running', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(
			(0, jest_mock_extended_1.mock)({ status: 'running' }),
		);
		const promise = waitingWebhooks.executeWebhook(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
		await expect(promise).rejects.toThrowError(conflict_error_1.ConflictError);
	});
	it('should throw ConflictError if the execution to resume already finished', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(
			(0, jest_mock_extended_1.mock)({ finished: true, workflowData: { nodes: [] } }),
		);
		const promise = waitingWebhooks.executeWebhook(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
		await expect(promise).rejects.toThrowError(conflict_error_1.ConflictError);
	});
});
//# sourceMappingURL=waiting-webhooks.test.js.map
