import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { SharedWorkflowRepository } from '@n8n/db';
import { OnLifecycleEvent, OnPubSubEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { toSaveSettings } from '@/execution-lifecycle/to-save-settings';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

@Service()
export class SelfHealingTriggerService {
	constructor(
		private readonly config: InstanceAiConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly ownership: SharedWorkflowRepository,
		private readonly logger: Logger,
	) {}

	@OnLifecycleEvent('workflowExecuteAfter')
	async onWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): Promise<void> {
		if (!this.shouldHandleFailure(ctx)) return;

		const failure = { workflowId: ctx.workflow.id, executionId: ctx.executionId };
		if (this.instanceSettings.instanceType === 'main') {
			// Admission is best-effort and must not delay execution completion.
			void this.handleFailure(failure);
		} else {
			await this.handleFailure(failure);
		}
	}

	@OnPubSubEvent('self-healing-failure', { instanceType: 'main' })
	async handleFailure(failure: PubSubCommandMap['self-healing-failure']): Promise<void> {
		if (!this.config.workflowSuggestionsEnabled) return;

		try {
			if (this.instanceSettings.instanceType !== 'main') {
				// Ask main to investigate. This process does not run the Assistant.
				await this.publisher.publishCommand({ command: 'self-healing-failure', payload: failure });
				return;
			}

			const project = await this.ownership.getWorkflowOwningProject(failure.workflowId);
			if (!project) return;

			// The Assistant runtime must only load on main processes.
			const { SelfHealingInvestigationService } = await import(
				'./self-healing-investigation.service.js'
			);

			await Container.get(SelfHealingInvestigationService).start({
				...failure,
				projectId: project.id,
			});
		} catch (error) {
			// A missed start waits for the next failure. It must not interrupt completion.
			this.logger.warn('Could not start self-healing after a production failure.', {
				...failure,
				error,
			});
		}
	}

	private shouldHandleFailure(ctx: WorkflowExecuteAfterContext): boolean {
		if (!this.config.workflowSuggestionsEnabled) return false;
		if (!ctx.executedInThisProcess) return false;
		if (ctx.runData.status !== 'error' && ctx.runData.status !== 'crashed') return false;

		// Only top-level production runs qualify. Exclude tests, retries, and child runs.
		if (ctx.mode !== 'trigger' && ctx.mode !== 'webhook' && ctx.mode !== 'chat') return false;
		if (ctx.retryOf || ctx.runData.data.parentExecution || ctx.runData.data.parentAgentRun) {
			return false;
		}

		// Exclude Assistant verification, including runs resumed from saved execution data.
		const source = ctx.source ?? ctx.runData.data.manualData?.source;
		if (source === 'instance_ai') return false;

		// Workers temporarily save failures even when saving is disabled.
		// These temporary records must not start an investigation.
		const saveErrors = toSaveSettings(ctx.workflow.settings).error;
		return saveErrors === true || saveErrors === 'all';
	}
}
