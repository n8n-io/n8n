import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { ScheduledTask, ScheduledTaskRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-node/poll-trigger-task';
import type { CrashStreak, ScheduledJobCrashJournal } from '../scheduled-job-crash-journal';
import { ScheduledJobCrashRecovery } from '../scheduled-job-crash-recovery';

const crashJournal = vi.hoisted(() => ({ crashed: true }));

vi.mock('@/crash-journal', () => ({
	didLastSessionCrash: () => crashJournal.crashed,
}));

const streak = (workflowId: string, crashes: number, nodeId = 'node-1'): CrashStreak => ({
	workflowId,
	nodeId,
	crashes,
});

describe('ScheduledJobCrashRecovery', () => {
	function setup({
		crashed = true,
		isMultiMain = false,
		workflowDeactivationEnabled = true,
		streaks = [] as CrashStreak[],
	} = {}) {
		crashJournal.crashed = crashed;
		const running = [mock<ScheduledTask>({ id: '1' })];
		const tasks = mock<ScheduledTaskRepository>();
		tasks.findRunningTasks.mockResolvedValue(running);
		const journal = mock<ScheduledJobCrashJournal>();
		journal.recordCrash.mockReturnValue(streaks);
		const executionRecoveryService = mock<ExecutionRecoveryService>();
		const logger = mockLogger();
		const scopedLogger = vi.mocked(logger.scoped)('scheduler');
		const recovery = new ScheduledJobCrashRecovery(
			logger,
			mock<ExecutionsConfig>({
				recovery: { workflowDeactivationEnabled, maxLastExecutions: 3 },
			}),
			mock<InstanceSettings>({ hostId: 'main-1', isMultiMain }),
			tasks,
			journal,
			executionRecoveryService,
		);
		return { recovery, running, tasks, journal, executionRecoveryService, logger: scopedLogger };
	}

	it('does nothing when the last session shut down cleanly', async () => {
		const { recovery, tasks, journal } = setup({ crashed: false });

		await recovery.recover();

		expect(tasks.findRunningTasks).not.toHaveBeenCalled();
		expect(journal.recordCrash).not.toHaveBeenCalled();
	});

	it('records every running occurrence as in flight on a single main', async () => {
		const { recovery, tasks, journal, running } = setup();

		await recovery.recover();

		expect(tasks.findRunningTasks).toHaveBeenCalledWith(POLL_TRIGGER_TASK_TYPE, {});
		expect(journal.recordCrash).toHaveBeenCalledWith(running);
	});

	it('records only the occurrences this host claimed in multi-main mode', async () => {
		const { recovery, tasks } = setup({ isMultiMain: true });

		await recovery.recover();

		expect(tasks.findRunningTasks).toHaveBeenCalledWith(POLL_TRIGGER_TASK_TYPE, {
			claimedBy: 'main-1',
		});
	});

	it('deactivates a workflow whose job reached the crash threshold and clears its streaks', async () => {
		const { recovery, journal, executionRecoveryService } = setup({
			streaks: [streak('wf-a', 3), streak('wf-b', 2)],
		});

		await recovery.recover();

		expect(executionRecoveryService.autoDeactivateWorkflow).toHaveBeenCalledTimes(1);
		expect(executionRecoveryService.autoDeactivateWorkflow).toHaveBeenCalledWith(
			'wf-a',
			'trigger-crashes',
		);
		expect(journal.clearWorkflow).toHaveBeenCalledExactlyOnceWith('wf-a');
	});

	it('counts but does not deactivate when auto deactivation is off', async () => {
		const { recovery, journal, executionRecoveryService } = setup({
			workflowDeactivationEnabled: false,
			streaks: [streak('wf-a', 3)],
		});

		await recovery.recover();

		expect(journal.recordCrash).toHaveBeenCalled();
		expect(executionRecoveryService.autoDeactivateWorkflow).not.toHaveBeenCalled();
	});

	it('logs and returns when the check fails', async () => {
		const { recovery, tasks, logger } = setup();
		tasks.findRunningTasks.mockRejectedValue(new Error('db down'));

		await expect(recovery.recover()).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to check scheduled jobs for crash loops',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
