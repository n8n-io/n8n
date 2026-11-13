import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { didLastSessionCrash } from '@/crash-journal';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { ScheduledJobCrashJournal } from './scheduled-job-crash-journal';

/** Deactivates a workflow whose scheduled job was in flight at each of the last N crashes. */
@Service()
export class ScheduledJobCrashRecovery {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly journal: ScheduledJobCrashJournal,
		private readonly executionRecoveryService: ExecutionRecoveryService,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	/** Runs at every startup, before the scheduler starts any job. */
	async recover(): Promise<void> {
		try {
			await this.deactivateCrashingWorkflows();
		} catch (error) {
			this.logger.error('Failed to check scheduled jobs for crash loops', {
				error: ensureError(error),
			});
		}
	}

	private async deactivateCrashingWorkflows() {
		const streaks = this.journal.startSession(didLastSessionCrash());
		for (const streak of streaks) {
			this.logger.warn('Scheduled job was in flight when the last session crashed', { ...streak });
		}

		const { workflowDeactivationEnabled, maxLastExecutions } = this.executionsConfig.recovery;
		if (!workflowDeactivationEnabled) return;
		for (const streak of streaks) {
			if (streak.crashes < maxLastExecutions) continue;
			this.logger.warn(
				'Scheduled job was in flight at each of the last crashes; deactivating its workflow',
				{ ...streak },
			);
			// A second job of a deactivated workflow finds it inactive and sends no second email.
			await this.executionRecoveryService.autoDeactivateWorkflow(
				streak.workflowId,
				'trigger-crashes',
			);
			this.journal.clearWorkflow(streak.workflowId);
		}
	}
}
