import type { CrashedExecution, ExecutionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

describe('ExecutionCrashService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const workflowStatisticsService = mock<WorkflowStatisticsService>();

	const crashService = new ExecutionCrashService(executionRepository, workflowStatisticsService);

	const crashedExecution = (id: string, overrides: Partial<CrashedExecution> = {}) => ({
		id,
		workflowId: `workflow-${id}`,
		workflowName: `Workflow ${id}`,
		mode: 'trigger' as const,
		...overrides,
	});

	/** Report the given batches the way the repository reports each batch it transitions. */
	const transitions = (batches: CrashedExecution[][]) =>
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			const crashed: CrashedExecution[] = [];

			for (const batch of batches) {
				onBatchTransitioned?.(batch);
				crashed.push(...batch);
			}

			return await Promise.resolve(crashed);
		});

	const emittedExecutions = () =>
		workflowStatisticsService.emit.mock.calls.map(([, payload]) => payload);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('reports the executions it transitioned for counting', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2', { mode: 'manual' });
		transitions([[first, second]]);

		const crashed = await crashService.markAsCrashed(['1', '2']);

		expect(crashed).toEqual([first, second]);
		expect(emittedExecutions()).toEqual([{ executions: [first, second] }]);
	});

	test('reports each batch as it transitions, so a later failure keeps earlier ones counted', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2');
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			onBatchTransitioned?.([first]);
			onBatchTransitioned?.([second]);

			return await Promise.reject(new Error('connection reset'));
		});

		await expect(crashService.markAsCrashed(['1', '2', '3'])).rejects.toThrow('connection reset');

		expect(emittedExecutions()).toEqual([{ executions: [first] }, { executions: [second] }]);
	});

	test('reports nothing when no execution transitioned', async () => {
		transitions([[]]);

		const crashed = await crashService.markAsCrashed(['1']);

		expect(crashed).toEqual([]);
		expect(workflowStatisticsService.emit).not.toHaveBeenCalled();
	});
});
