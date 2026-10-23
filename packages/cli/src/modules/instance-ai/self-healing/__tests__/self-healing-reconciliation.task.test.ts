import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { DatabaseConfig, InstanceAiConfig } from '@n8n/config';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InMemorySystemTaskRunner } from '@/scheduling/system-tasks/in-memory-system-task-runner';

import { InstanceAiCheckpointPruningTask } from '../../instance-ai-checkpoint-pruning.task';
import type { InstanceAiService } from '../../instance-ai.service';
import type { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import { SelfHealingReconciliationTask } from '../self-healing-reconciliation.task';
import type { SelfHealingTemporaryWorkflowService } from '../self-healing-temporary-workflow.service';

describe('SelfHealingReconciliationTask', () => {
	function setup() {
		const config = mock<InstanceAiConfig>({
			pruneInterval: 1000,
			workflowSuggestionsEnabled: false,
		});
		const investigations = mock<SelfHealingInvestigationService>();
		const task = new SelfHealingReconciliationTask(investigations);
		return { config, investigations, task };
	}

	it('retries existing work every minute when new investigations are disabled', async () => {
		const { task, investigations } = setup();
		const { signal } = new AbortController();

		await task.run(signal);

		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 60 });
		expect(task.target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: true },
			leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
		});
		expect(investigations.reconcile).toHaveBeenCalledWith(signal);
	});

	it('does not start recovery after cancellation', async () => {
		const { task, investigations } = setup();
		await task.run(AbortSignal.abort());
		expect(investigations.reconcile).not.toHaveBeenCalled();
	});

	it.each(['pending', 'rejected'] as const)(
		'keeps cleanup running while recovery is %s',
		async (state) => {
			vi.useFakeTimers();
			const { config, investigations, task } = setup();
			const recovery = createDeferredPromise();
			investigations.reconcile.mockReturnValue(recovery.promise);
			const assistant = mock<InstanceAiService>();
			const temporaryWorkflows = mock<SelfHealingTemporaryWorkflowService>();
			const pruning = new InstanceAiCheckpointPruningTask(
				config,
				mock<DatabaseConfig>({ type: 'sqlite' }),
				assistant,
				temporaryWorkflows,
			);
			const reportFailure = vi.fn();
			const runner = new InMemorySystemTaskRunner(
				'leader_timer',
				mock<Logger>(),
				mock<EventService>(),
				new Tracing(),
				'UTC',
				{ reportFailure },
			);
			runner.add(task, task.schedule, { runOnStart: true, retryDelaySeconds: 30 });
			runner.add(pruning, pruning.schedule, { runOnStart: true });

			try {
				runner.start(new Date());
				if (state === 'rejected') recovery.reject(new Error('Investigation query failed.'));
				await vi.advanceTimersByTimeAsync(1000);

				expect(assistant.pruneExpiredData).toHaveBeenCalledTimes(2);
				expect(temporaryWorkflows.cleanupAbandoned).toHaveBeenCalledTimes(2);
				if (state === 'pending') {
					expect(investigations.reconcile).toHaveBeenCalledOnce();
					expect(reportFailure).not.toHaveBeenCalled();
				} else {
					expect(reportFailure).toHaveBeenCalledWith(
						'A system task run failed',
						task,
						expect.any(Error),
					);
				}
			} finally {
				recovery.resolve();
				await runner.stop();
				vi.useRealTimers();
			}
		},
	);
});
