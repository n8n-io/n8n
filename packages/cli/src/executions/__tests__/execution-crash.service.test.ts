import type { EventService, ExecutionLedger } from '@n8n/backend-services';
import type { CrashedExecution, ExecutionRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

describe('ExecutionCrashService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const workflowStatisticsService = mock<WorkflowStatisticsService>();
	const eventService = mock<EventService>();
	const instanceSettings = mock<InstanceSettings>({ hostId: 'main-1' });
	const executionLedger = mock<ExecutionLedger>({ isEnabled: true });

	const crashService = new ExecutionCrashService(
		executionRepository,
		workflowStatisticsService,
		eventService,
		instanceSettings,
		executionLedger,
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
			workflowVersionId,
			mode,
			retryOf,
			startedAt: rowStartedAt,
			stoppedAt: rowStoppedAt,
			tracingContext,
			workflowCustomTelemetryTags,
			project,
		}: CrashedExecution,
		detector: string,
	) => [
		'execution-crashed',
		{
			executionId: id,
			workflowId,
			workflowName,
			workflowVersionId,
			mode,
			retryOf,
			startedAt: rowStartedAt ?? undefined,
			stoppedAt: rowStoppedAt,
			detector,
			hostId: 'main-1',
			tracingContext,
			workflowCustomTelemetryTags,
			project,
		},
	];

	const transitions = (batch: CrashedExecution[]) =>
		executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
			onBatchTransitioned?.(batch);

			return await Promise.resolve(batch);
		});

	const emitted = () => workflowStatisticsService.emit.mock.calls;
	const announced = () => eventService.emit.mock.calls;
	const recordedEnded = () => executionLedger.recordEnded.mock.calls.map(([facts]) => facts);

	const endedFactsOf = (execution: CrashedExecution, rowStoppedAt = execution.stoppedAt) => ({
		executionId: execution.id,
		workflowId: execution.workflowId,
		workflowName: execution.workflowName,
		mode: execution.mode,
		occurredAt: rowStoppedAt,
		outcome: 'crashed',
		runtimeMs: rowStoppedAt.getTime() - startedAt.getTime(),
		timeSavedMin: 0,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		executionLedger.recordEnded.mockResolvedValue();
		Object.assign(executionLedger, { isEnabled: true });
	});

	test('reports the executions it transitioned for counting', async () => {
		const first = crashedExecution('1');
		const second = crashedExecution('2', { mode: 'manual' });
		transitions([first, second]);

		const crashed = await crashService.markAsCrashed(['1', '2'], 'queue-recovery');

		expect(crashed).toEqual([first, second]);
		expect(emitted()).toEqual([['executionsCrashed', { executions: [first, second] }]]);
	});

	test('announces each execution it transitioned with the detector, host and trace context', async () => {
		const first = crashedExecution('1', {
			tracingContext: { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' },
			workflowVersionId: 'version-1',
			retryOf: '9',
			workflowCustomTelemetryTags: [{ key: 'env', value: 'production' }],
			project: { id: 'project-1', customTelemetryTags: [{ key: 'team', value: 'platform' }] },
		});
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

	test('announces the stop time the caller gives instead of the claim time', async () => {
		const first = crashedExecution('1');
		const lastNodeStoppedAt = new Date('2025-01-01T00:00:30.000Z');
		transitions([first]);

		const crashed = await crashService.markAsCrashedWithoutCounting('1', 'startup-recovery', {
			stoppedAt: lastNodeStoppedAt,
		});

		expect(crashed).toEqual([first]);
		expect(announced()).toEqual([
			announcementOf({ ...first, stoppedAt: lastNodeStoppedAt }, 'startup-recovery'),
		]);
	});

	test('counts and announces a waiting execution it transitioned', async () => {
		const waiting = crashedExecution('1', { mode: 'webhook' });
		executionRepository.markAsCrashedFrom.mockImplementation(async (_id, _status, options) => {
			options?.onTransitioned?.([waiting]);

			return await Promise.resolve(true);
		});

		const crashed = await crashService.markAsCrashedFrom('1', 'waiting', 'resume-limit', 2);

		expect(crashed).toBe(true);
		expect(executionRepository.markAsCrashedFrom).toHaveBeenCalledWith(
			'1',
			'waiting',
			expect.objectContaining({ expectedAttempts: 2 }),
		);
		expect(emitted()).toEqual([['executionsCrashed', { executions: [waiting] }]]);
		expect(announced()).toEqual([announcementOf(waiting, 'resume-limit')]);
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

	describe('announceStalledExecution', () => {
		test('announces an execution already transitioned to crashed', async () => {
			const tracingContext = {
				traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
			};
			executionRepository.findSingleExecution.mockResolvedValue({
				id: '1',
				workflowId: 'workflow-1',
				mode: 'trigger',
				status: 'crashed',
				startedAt,
				stoppedAt,
				retryOf: '9',
				workflowVersionId: 'version-1',
				tracingContext,
			} as never);

			await crashService.announceStalledExecution('1');

			expect(announced()).toEqual([
				announcementOf(
					crashedExecution('1', {
						workflowName: undefined,
						retryOf: '9',
						workflowVersionId: 'version-1',
						tracingContext,
					}),
					'stall',
				),
			]);
			expect(workflowStatisticsService.emit).not.toHaveBeenCalled();
		});

		test.each([
			['is missing', undefined],
			['is not crashed', { id: '1', status: 'error', stoppedAt }],
			['has no stop time', { id: '1', status: 'crashed', stoppedAt: null }],
		])('does not announce when the execution %s', async (_name, row) => {
			executionRepository.findSingleExecution.mockResolvedValue(row as never);

			await crashService.announceStalledExecution('1');

			expect(announced()).toEqual([]);
			expect(executionLedger.recordEnded).not.toHaveBeenCalled();
		});

		test('records the ended row of the stalled run with the workflow name', async () => {
			executionRepository.findSingleExecution.mockResolvedValue({
				id: '1',
				workflowId: 'workflow-1',
				mode: 'trigger',
				status: 'crashed',
				startedAt,
				stoppedAt,
			} as never);

			await crashService.announceStalledExecution('1', 'Stalled workflow');

			await vi.waitFor(() =>
				expect(recordedEnded()).toEqual([
					endedFactsOf(crashedExecution('1', { workflowName: 'Stalled workflow' })),
				]),
			);
		});
	});

	describe('ledger ended rows', () => {
		test('records an ended row for each execution it crashed', async () => {
			const first = crashedExecution('1');
			const second = crashedExecution('2');
			transitions([first, second]);

			await crashService.markAsCrashed(['1', '2'], 'queue-recovery');

			await vi.waitFor(() =>
				expect(recordedEnded()).toEqual([endedFactsOf(first), endedFactsOf(second)]),
			);
		});

		test('records the ended row with the stop time the caller gives', async () => {
			const first = crashedExecution('1');
			const lastNodeStoppedAt = new Date('2025-01-01T00:00:30.000Z');
			transitions([first]);

			await crashService.markAsCrashedWithoutCounting('1', 'startup-recovery', {
				stoppedAt: lastNodeStoppedAt,
			});

			await vi.waitFor(() =>
				expect(recordedEnded()).toEqual([endedFactsOf(first, lastNodeStoppedAt)]),
			);
		});

		test('records an ended row for each execution of a deactivated workflow', async () => {
			const first = crashedExecution('1');
			executionRepository.markWorkflowExecutionsAsCrashed.mockResolvedValue([first]);

			await crashService.markWorkflowExecutionsAsCrashed('workflow-1');

			await vi.waitFor(() => expect(recordedEnded()).toEqual([endedFactsOf(first)]));
		});

		test('records an ended row for a waiting execution that ran out of resume attempts', async () => {
			const waiting = crashedExecution('1', { mode: 'webhook' });
			executionRepository.markAsCrashedFrom.mockImplementation(async (_id, _status, options) => {
				options?.onTransitioned?.([waiting]);
				return await Promise.resolve(true);
			});

			await crashService.markAsCrashedFrom('1', 'waiting', 'resume-limit', 2);

			await vi.waitFor(() => expect(recordedEnded()).toEqual([endedFactsOf(waiting)]));
		});

		test('has no runtime for an execution that never started', async () => {
			transitions([crashedExecution('1', { startedAt: null })]);

			await crashService.markAsCrashed(['1'], 'start-failure');

			await vi.waitFor(() => expect(recordedEnded()).toMatchObject([{ runtimeMs: 0 }]));
		});

		test('writes the rows one at a time', async () => {
			const firstWrite = createDeferredPromise();
			executionLedger.recordEnded.mockReturnValueOnce(firstWrite.promise);
			transitions([crashedExecution('1'), crashedExecution('2')]);

			await crashService.markAsCrashed(['1', '2'], 'queue-recovery');
			await vi.waitFor(() => expect(executionLedger.recordEnded).toHaveBeenCalledTimes(1));

			firstWrite.resolve();
			await vi.waitFor(() => expect(executionLedger.recordEnded).toHaveBeenCalledTimes(2));
		});

		test('waits for the rows of one batch before it writes the next batch', async () => {
			const firstWrite = createDeferredPromise();
			executionLedger.recordEnded.mockReturnValueOnce(firstWrite.promise);
			executionRepository.markAsCrashed.mockImplementation(async (_ids, onBatchTransitioned) => {
				onBatchTransitioned?.([crashedExecution('1')]);
				onBatchTransitioned?.([crashedExecution('2')]);
				return await Promise.resolve([]);
			});

			await crashService.markAsCrashed(['1', '2'], 'queue-recovery');
			await vi.waitFor(() => expect(executionLedger.recordEnded).toHaveBeenCalledTimes(1));

			firstWrite.resolve();
			await vi.waitFor(() => expect(executionLedger.recordEnded).toHaveBeenCalledTimes(2));
		});

		test('records nothing when the ledger module is off', async () => {
			Object.assign(executionLedger, { isEnabled: false });
			transitions([crashedExecution('1')]);

			await crashService.markAsCrashed(['1'], 'queue-recovery');

			expect(executionLedger.recordEnded).not.toHaveBeenCalled();
		});
	});
});
