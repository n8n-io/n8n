import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { didLastSessionCrash } from '@/crash-journal';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { WorkflowCrashJournal } from './workflow-crash-journal';

/** Deactivates the workflow that was alone in flight at each of the last N crashes. */
@Service()
export class CrashLoopRecovery {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly journal: WorkflowCrashJournal,
		private readonly executionRecoveryService: ExecutionRecoveryService,
	) {}

	/**
	 * Runs at every startup, after the event bus noted the executions that did not finish
	 * and before the scheduler starts any job.
	 */
	async recover(): Promise<void> {
		try {
			await this.deactivateCrashingWorkflow();
		} catch (error) {
			this.logger.error('Failed to check workflows for crash loops', {
				error: ensureError(error),
			});
		}
	}

	private async deactivateCrashingWorkflow() {
		const suspect = this.journal.startSession(didLastSessionCrash());
		if (!suspect) return;
		this.logger.warn('Workflow was alone in flight when the last session crashed', { ...suspect });

		const { workflowDeactivationEnabled, maxLastExecutions } = this.executionsConfig.recovery;
		if (!workflowDeactivationEnabled || suspect.crashes < maxLastExecutions) return;
		this.logger.warn('Deactivating workflow that was alone in flight at the last crashes', {
			...suspect,
		});
		const outcome = await this.executionRecoveryService.autoDeactivateWorkflow(
			suspect.workflowId,
			'process-crashes',
		);
		// A failed deactivation keeps the streak, so the next crash retries at once.
		if (outcome !== 'failed') this.journal.clearWorkflow(suspect.workflowId);
	}
}
