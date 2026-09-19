import type { CrashedExecution, ExecutionRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

describe('ExecutionCrashService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const workflowStatisticsService = mock<WorkflowStatisticsService>();
	const eventService = mock<EventService>();
	const instanceSettings = mock<InstanceSettings>({ hostId: 'main-1' });

	const crashService = new ExecutionCrashService(
		executionRepository,
		workflowStatisticsService,
		eventService,
		instanceSettings,
	);

	const startedAt = new Date('2025-01-01T00:00:00.000Z');
	const stoppedAt = new Date('2025-01-01T00:01:00.000Z');

	const crashedExecution = (
		id: string,
		overrides: Partial<CrashedExecution> = {},
	): CrashedExecution => ({
		id,
		workflowId: `workflow-${id}`,
		workflowName: `Workflow ${id}`,
		mode: 'trigger',
		startedAt,
		stoppedAt,
		...overrides,
	});

	const announcementOf = (
		{
			id,
			workflowId,
			workflowName,
			mode,
			startedAt: rowStartedAt,
			stoppedAt: rowStoppedAt,
		}: CrashedExecution,
		detector: string,
	) => [
		'execution-crashed',
		{
			executionId: id,
			workflowId,
			workflowName,
			mode,
			startedAt: rowStartedAt ?? undefined,
			stoppedAt: rowStoppedAt,
			detector,
			hostId: 'main-1',
		},
	];

	const transitions = (batch: CrashedExecution[]) =>
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			onBatchTransitioned?.(batch);

			return await Promise.resolve(batch);
		});

	const emitted = () => workflowStatisticsService.emit.mock.calls;
	const announced = () => eventService.emit.mock.calls;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('reports the executions it transitioned for counting', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2', { mode: 'manual' });
		transitions([first, second]);

		const crashed = await crashService.markAsCrashed(['1', '2'], 'queue-recovery');

		expect(crashed).toEqual([first, second]);
		expect(emitted()).toEqual([['executionsCrashed', { executions: [first, second] }]]);
	});

	test('announces each execution it transitioned with the detector and host', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2', { mode: 'manual', startedAt: null });
		transitions([first, second]);

		await crashService.markAsCrashed(['1', '2'], 'queue-recovery');

		expect(announced()).toEqual([
			announcementOf(first, 'queue-recovery'),
			announcementOf(second, 'queue-recovery'),
		]);
	});

	test('reports each batch as it transitions, so a later failure keeps earlier ones counted', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2');
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			onBatchTransitioned?.([first]);
			onBatchTransitioned?.([second]);

			return await Promise.reject(new Error('connection reset'));
		});

		await expect(crashService.markAsCrashed(['1', '2', '3'], 'start-failure')).rejects.toThrow(
			'connection reset',
		);

		expect(emitted()).toEqual([
			['executionsCrashed', { executions: [first] }],
			['executionsCrashed', { executions: [second] }],
		]);
	});

	test('announces each batch as it transitions, so a later failure keeps earlier announcements', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2');
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			onBatchTransitioned?.([first]);
			onBatchTransitioned?.([second]);

			return await Promise.reject(new Error('connection reset'));
		});

		await expect(crashService.markAsCrashed(['1', '2', '3'], 'start-failure')).rejects.toThrow(
			'connection reset',
		);

		expect(announced()).toEqual([
			announcementOf(first, 'start-failure'),
			announcementOf(second, 'start-failure'),
		]);
	});

	test('reports nothing when no execution transitioned', async () => {
		transitions([]);

		const crashed = await crashService.markAsCrashed(['1'], 'queue-recovery');

		expect(crashed).toEqual([]);
		expect(workflowStatisticsService.emit).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	test('announces but counts nothing when the caller counts the executions itself', async () => {
		const first = crashedExecution('1');
		transitions([first]);

		const crashed = await crashService.markAsCrashedWithoutCounting('1', 'stall');

		expect(crashed).toEqual([first]);
		expect(executionRepository.markAsCrashed).toHaveBeenCalledWith('1', expect.any(Function));
		expect(workflowStatisticsService.emit).not.toHaveBeenCalled();
		expect(announced()).toEqual([announcementOf(first, 'stall')]);
	});

	test('reports the executions it transitioned for a whole workflow', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2');
		executionRepository.markWorkflowExecutionsAsCrashed.mockResolvedValue([first, second]);

		const crashed = await crashService.markWorkflowExecutionsAsCrashed('workflow-1');

		expect(crashed).toEqual([first, second]);
		expect(emitted()).toEqual([['executionsCrashed', { executions: [first, second] }]]);
	});

	test('announces the executions it transitioned for a whole workflow as a deactivation', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2');
		executionRepository.markWorkflowExecutionsAsCrashed.mockResolvedValue([first, second]);

		await crashService.markWorkflowExecutionsAsCrashed('workflow-1');

		expect(announced()).toEqual([
			announcementOf(first, 'workflow-deactivation'),
			announcementOf(second, 'workflow-deactivation'),
		]);
	});

	test('reports nothing when a workflow has no execution to transition', async () => {
		executionRepository.markWorkflowExecutionsAsCrashed.mockResolvedValue([]);

		const crashed = await crashService.markWorkflowExecutionsAsCrashed('workflow-1');

		expect(crashed).toEqual([]);
		expect(workflowStatisticsService.emit).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});
});
