import { Logger } from '@n8n/backend-common';
import type { SchedulerConfig } from '@n8n/config';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { NoOpPollJobManager, PollJobManager } from 'n8n-core';

import { PollTriggerJobRegistrar } from './poll-trigger-job-registrar';

/**
 * Whether the durable scheduler has taken over poll triggers. Both
 * {@link PollJobProvider} (which registers the job manager) and
 * `PollCursorService` (which decides whether to read/commit a durable cursor)
 * must agree on this exactly, or a poll could be scheduled by one engine while
 * the other believes it owns the cursor.
 */
export function isPollSchedulingActive(
	schedulerConfig: SchedulerConfig,
	workflowsConfig: WorkflowsConfig,
): boolean {
	return (
		schedulerConfig.enabled &&
		workflowsConfig.useWorkflowPublicationService &&
		schedulerConfig.enabledForPollTriggers
	);
}

/**
 * Decides, from config, which {@link PollJobManager} implementation activation
 * code resolves from DI: {@link PollTriggerJobRegistrar} when the durable path
 * is enabled, {@link NoOpPollJobManager} otherwise. This is the one place that
 * criteria lives; neither implementation decides it for itself.
 */
@Service()
export class PollJobProvider {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly pollTriggerJobRegistrar: PollTriggerJobRegistrar,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	/** Called once at startup, lazily before the first workflow activation. */
	init(): void {
		const active = isPollSchedulingActive(this.globalConfig.scheduler, this.workflowsConfig);

		if (
			this.globalConfig.scheduler.enabled &&
			!this.workflowsConfig.useWorkflowPublicationService
		) {
			this.logger.warn(
				'N8N_SCHEDULER_ENABLED is set but the workflow publication service is disabled. The durable scheduler cannot take over poll triggers, which keep using the legacy in-memory engine.',
			);
		}

		Container.set(PollJobManager, active ? this.pollTriggerJobRegistrar : new NoOpPollJobManager());
	}
}
