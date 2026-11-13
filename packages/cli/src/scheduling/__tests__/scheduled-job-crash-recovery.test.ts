import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

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
		workflowDeactivationEnabled = true,
		streaks = [] as CrashStreak[],
	} = {}) {
		crashJournal.crashed = crashed;
		const journal = mock<ScheduledJobCrashJournal>();
		journal.startSession.mockReturnValue(streaks);
		const executionRecoveryService = mock<ExecutionRecoveryService>();
		const logger = mockLogger();
		const scopedLogger = vi.mocked(logger.scoped)('scheduler');
		const recovery = new ScheduledJobCrashRecovery(
			logger,
			mock<ExecutionsConfig>({
				recovery: { workflowDeactivationEnabled, maxLastExecutions: 3 },
			}),
			journal,
			executionRecoveryService,
		);
		return { recovery, journal, executionRecoveryService, logger: scopedLogger };
	}

	it.each([true, false])('starts a session of the journal when crashed is %s', async (crashed) => {
		const { recovery, journal } = setup({ crashed });

		await recovery.recover();

		expect(journal.startSession).toHaveBeenCalledWith(crashed);
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

		expect(journal.startSession).toHaveBeenCalled();
		expect(executionRecoveryService.autoDeactivateWorkflow).not.toHaveBeenCalled();
	});

	it('logs and returns when the check fails', async () => {
		const { recovery, journal, logger } = setup();
		journal.startSession.mockImplementation(() => {
			throw new Error('disk full');
		});

		await expect(recovery.recover()).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to check scheduled jobs for crash loops',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
