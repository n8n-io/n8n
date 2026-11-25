import type { ExecutionLedger } from '@n8n/backend-services';
import type { CanceledExecution, ExecutionRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { ExecutionCancelService } from '@/executions/execution-cancel.service';

describe('ExecutionCancelService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const executionLedger = mock<ExecutionLedger>({ isEnabled: true });
	let cancelService: ExecutionCancelService;

	const startedAt = new Date('2025-01-01T00:00:00.000Z');
	const stoppedAt = new Date('2025-01-01T00:01:00.000Z');
	const canceledExecution = (id: string): CanceledExecution => ({
		id,
		workflowId: `workflow-${id}`,
		workflowName: `Workflow ${id}`,
		mode: 'trigger',
		startedAt,
		stoppedAt,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		Object.defineProperty(executionLedger, 'isEnabled', { value: true, configurable: true });
		executionLedger.recordEndedInSequence.mockResolvedValue();
		cancelService = new ExecutionCancelService(executionRepository, executionLedger);
	});

	it('records one canceled row for each run the cancel moved', async () => {
		executionRepository.markAsCanceled.mockResolvedValue([
			canceledExecution('1'),
			canceledExecution('2'),
		]);

		const { canceled, recorded } = await cancelService.markAsCanceled(['1', '2', '3'], ['running']);
		await recorded;

		expect(executionRepository.markAsCanceled).toHaveBeenCalledWith(['1', '2', '3'], ['running']);
		expect(canceled.map(({ id }) => id)).toEqual(['1', '2']);
		expect(executionLedger.recordEndedInSequence).toHaveBeenCalledExactlyOnceWith([
			expect.objectContaining({ executionId: '1', outcome: 'canceled', runtimeMs: 60_000 }),
			expect.objectContaining({ executionId: '2', outcome: 'canceled', runtimeMs: 60_000 }),
		]);
	});

	it('records nothing when no run moved', async () => {
		executionRepository.markAsCanceled.mockResolvedValue([]);

		await (await cancelService.markAsCanceled(['1'])).recorded;

		expect(executionLedger.recordEndedInSequence).not.toHaveBeenCalled();
	});

	it('records nothing when the ledger is off', async () => {
		Object.defineProperty(executionLedger, 'isEnabled', { value: false, configurable: true });
		executionRepository.markAsCanceled.mockResolvedValue([canceledExecution('1')]);

		await (await cancelService.markAsCanceled(['1'])).recorded;

		expect(executionLedger.recordEndedInSequence).not.toHaveBeenCalled();
	});

	it('settles `recorded` only after the rows are written', async () => {
		const write = createDeferredPromise<undefined>();
		executionLedger.recordEndedInSequence.mockReturnValue(write.promise);
		executionRepository.markAsCanceled.mockResolvedValue([canceledExecution('1')]);

		let settled = false;
		const { recorded } = await cancelService.markAsCanceled(['1']);
		void recorded.then(() => (settled = true));
		await new Promise((resolve) => setImmediate(resolve));
		expect(settled).toBe(false);

		write.resolve(undefined);
		await recorded;
		expect(settled).toBe(true);
	});
});
