import { StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import type { ExecutionLedgerRow, FirstOccurrenceRow, OperationContext } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { WorkflowStatisticsFoldStep } from '../workflow-statistics.fold-step';
import type { WorkflowStatisticsService } from '../workflow-statistics.service';

function row(overrides: Partial<ExecutionLedgerRow> = {}): ExecutionLedgerRow {
	return {
		id: '1',
		executionId: '1',
		occurredAt: new Date('2026-01-01T00:00:00Z'),
		entityType: 'workflow',
		entityName: 'Workflow',
		entityId: 'wf-1',
		projectId: 'project-1',
		mode: 'webhook',
		source: 'none',
		event: 'ended',
		outcome: 'success',
		blockedBy: 'none',
		runtimeMs: 0,
		timeSavedMin: 0,
		origin: 'v1',
		eventId: 'event-1',
		...overrides,
	};
}

const occurrence = (overrides: Partial<FirstOccurrenceRow> = {}): FirstOccurrenceRow => ({
	name: StatisticsNames.productionSuccess,
	workflowId: 'wf-1',
	workflowName: 'Workflow',
	firstEventMs: 1000,
	...overrides,
});

describe('WorkflowStatisticsFoldStep', () => {
	const repository = mock<WorkflowStatisticsRepository>();
	const service = mock<WorkflowStatisticsService>();
	const errorReporter = mock<ErrorReporter>();
	const ctx: OperationContext = {};
	let step: WorkflowStatisticsFoldStep;

	beforeEach(() => {
		vi.resetAllMocks();
		step = new WorkflowStatisticsFoldStep(repository, service, errorReporter);
	});

	test('has a name that the fold step registry accepts', () => {
		expect(step.name).toBe('workflow_statistics');
		expect(/^[a-z][a-z0-9_]{0,47}$/.test(step.name)).toBe(true);
	});

	test('returns undefined and writes nothing when no row counts', async () => {
		const rows = [row({ origin: 'v2' }), row({ mode: 'chat' })];

		await expect(step.fold(rows, ctx)).resolves.toBeUndefined();
		expect(repository.addIncrements).not.toHaveBeenCalled();
	});

	test('returns undefined when no counter is new', async () => {
		repository.addIncrements.mockResolvedValue([]);

		await expect(step.fold([row()], ctx)).resolves.toBeUndefined();
	});

	test('passes the same context object to the repository', async () => {
		repository.addIncrements.mockResolvedValue([]);

		await step.fold([row()], ctx);

		expect(repository.addIncrements).toHaveBeenCalledWith(
			[expect.objectContaining({ workflowId: 'wf-1', count: 1 })],
			ctx,
		);
		expect(repository.addIncrements.mock.calls[0][1]).toBe(ctx);
	});

	test('emits milestones only when the returned closure runs', async () => {
		repository.addIncrements.mockResolvedValue([
			occurrence(),
			occurrence({ name: StatisticsNames.productionError, workflowId: 'wf-2', workflowName: null }),
		]);

		const afterCommit = await step.fold([row()], ctx);

		expect(service.emitFirstOccurrenceEvent).not.toHaveBeenCalled();
		await afterCommit?.();
		expect(service.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
		expect(service.emitFirstOccurrenceEvent).toHaveBeenNthCalledWith(
			1,
			StatisticsNames.productionSuccess,
			'wf-1',
			'Workflow',
			1000,
		);
		expect(service.emitFirstOccurrenceEvent).toHaveBeenNthCalledWith(
			2,
			StatisticsNames.productionError,
			'wf-2',
			null,
			1000,
		);
	});

	test('reports a failing milestone and still emits the next one', async () => {
		const failure = new Error('emit failed');
		repository.addIncrements.mockResolvedValue([
			occurrence({ workflowId: 'wf-1' }),
			occurrence({ workflowId: 'wf-2' }),
		]);
		service.emitFirstOccurrenceEvent.mockRejectedValueOnce(failure).mockResolvedValueOnce();

		const afterCommit = await step.fold([row()], ctx);

		await expect(afterCommit?.()).resolves.toBeUndefined();
		expect(errorReporter.error).toHaveBeenCalledTimes(1);
		expect(errorReporter.error).toHaveBeenCalledWith(failure, { shouldBeLogged: true });
		expect(service.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
		expect(service.emitFirstOccurrenceEvent).toHaveBeenLastCalledWith(
			StatisticsNames.productionSuccess,
			'wf-2',
			'Workflow',
			1000,
		);
	});
});
