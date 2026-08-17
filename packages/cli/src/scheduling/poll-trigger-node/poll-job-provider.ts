import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { NoOpPollJobManager, PollJobManager } from 'n8n-core';

import { DurablePollerGateService } from '@/workflows/triggers/durable-poller-gate.service';

import { PollTriggerJobRegistrar } from './poll-trigger-job-registrar';

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
		private readonly durablePollerGateService: DurablePollerGateService,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	/** Called once at startup, lazily before the first workflow activation. */
	init(): void {
		const intercepting =
			this.globalConfig.scheduler.enabled && this.workflowsConfig.useWorkflowPublicationService;
		const active =
			intercepting &&
			this.globalConfig.scheduler.enabledForPollTriggers &&
			this.durablePollerGateService.allowed;

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
