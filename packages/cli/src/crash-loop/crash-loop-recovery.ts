import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { didLastSessionCrash } from '@/crash-journal';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { WorkflowCrashJournal } from './workflow-crash-journal';

/** Deactivates a workflow that was in flight at N or more crashes within the window. */
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
			await this.deactivateCrashingWorkflows();
		} catch (error) {
			this.logger.error('Failed to check workflows for crash loops', {
				error: ensureError(error),
			});
		}
	}

	private async deactivateCrashingWorkflows() {
		const crashed = this.journal.startSession(didLastSessionCrash());
		for (const workflow of crashed) {
			this.logger.warn('Workflow was in flight when the last session crashed', { ...workflow });
		}

		const { workflowDeactivationEnabled, maxLastExecutions } = this.executionsConfig.recovery;
		if (!workflowDeactivationEnabled) return;
		for (const workflow of crashed) {
			if (workflow.crashes < maxLastExecutions) continue;
			this.logger.warn('Deactivating workflow that was in flight at too many crashes', {
				...workflow,
			});
			await this.executionRecoveryService.autoDeactivateWorkflow(
				workflow.workflowId,
				'process-crashes',
			);
			this.journal.clearWorkflow(workflow.workflowId);
		}
	}
}
