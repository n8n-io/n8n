import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { CrashLoopRecovery } from '../crash-loop-recovery';
import type { WorkflowCrashes, WorkflowCrashJournal } from '../workflow-crash-journal';

const crashJournal = vi.hoisted(() => ({ crashed: true }));

vi.mock('@/crash-journal', () => ({
	didLastSessionCrash: () => crashJournal.crashed,
}));

describe('CrashLoopRecovery', () => {
	function setup({
		crashed = true,
		workflowDeactivationEnabled = true,
		crashes = [] as WorkflowCrashes[],
	} = {}) {
		crashJournal.crashed = crashed;
		const journal = mock<WorkflowCrashJournal>();
		journal.startSession.mockReturnValue(crashes);
		const executionRecoveryService = mock<ExecutionRecoveryService>();
		const logger = mockLogger();
		const recovery = new CrashLoopRecovery(
			logger,
			mock<ExecutionsConfig>({
				recovery: { workflowDeactivationEnabled, maxLastExecutions: 3 },
			}),
			journal,
			executionRecoveryService,
		);
		return { recovery, journal, executionRecoveryService, logger };
	}

	it.each([true, false])('starts a session of the journal when crashed is %s', async (crashed) => {
		const { recovery, journal } = setup({ crashed });

		await recovery.recover();

		expect(journal.startSession).toHaveBeenCalledWith(crashed);
	});

	it('deactivates a workflow that reached the crash threshold and clears its crashes', async () => {
		const { recovery, journal, executionRecoveryService } = setup({
			crashes: [
				{ workflowId: 'wf-a', crashes: 3 },
				{ workflowId: 'wf-b', crashes: 2 },
			],
		});

		await recovery.recover();

		expect(executionRecoveryService.autoDeactivateWorkflow).toHaveBeenCalledTimes(1);
		expect(executionRecoveryService.autoDeactivateWorkflow).toHaveBeenCalledWith(
			'wf-a',
			'process-crashes',
		);
		expect(journal.clearWorkflow).toHaveBeenCalledExactlyOnceWith('wf-a');
	});

	it('counts but does not deactivate when auto deactivation is off', async () => {
		const { recovery, journal, executionRecoveryService } = setup({
			workflowDeactivationEnabled: false,
			crashes: [{ workflowId: 'wf-a', crashes: 3 }],
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
			'Failed to check workflows for crash loops',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
