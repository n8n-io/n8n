import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { InstanceSettings } from 'n8n-core';

import { didLastSessionCrash } from '@/crash-journal';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { ScheduledJobCrashJournal } from './scheduled-job-crash-journal';

/** Deactivates a workflow whose scheduled job was in flight at each of the last N crashes. */
@Service()
export class ScheduledJobCrashRecovery {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly scheduledTaskRepository: ScheduledTaskRepository,
		private readonly journal: ScheduledJobCrashJournal,
		private readonly executionRecoveryService: ExecutionRecoveryService,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async recover(): Promise<void> {
		if (!didLastSessionCrash()) return;
		try {
			await this.deactivateCrashingWorkflows();
		} catch (error) {
			this.logger.error('Failed to check scheduled jobs for crash loops', {
				error: ensureError(error),
			});
		}
	}

	private async deactivateCrashingWorkflows() {
		const { hostId, isMultiMain } = this.instanceSettings;
		// With one main, every running row belongs to the crashed process.
		const running = await this.scheduledTaskRepository.findRunningTasks(
			isMultiMain ? { claimedBy: hostId } : {},
		);
		const streaks = this.journal.recordCrash(running);
		for (const streak of streaks) {
			this.logger.warn('Scheduled job was in flight when the last session crashed', { ...streak });
		}

		const { workflowDeactivationEnabled, maxLastExecutions } = this.executionsConfig.recovery;
		if (!workflowDeactivationEnabled) return;
		const workflowIds = new Set(
			streaks.filter((streak) => streak.crashes >= maxLastExecutions).map((s) => s.workflowId),
		);
		for (const workflowId of workflowIds) {
			this.logger.warn(
				'Scheduled job was in flight at each of the last crashes; deactivating its workflow',
				{ workflowId, crashes: maxLastExecutions },
			);
			await this.executionRecoveryService.autoDeactivateWorkflow(workflowId);
		}
	}
}
