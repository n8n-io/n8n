import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers, ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';

/**
 * Tears down in-memory triggers on leader stepdown and shutdown. Teardown is
 * coordinated with in-flight outbox records via {@link WorkflowPublicationLifecycleLock}.
 */
@Service()
export class PublishedWorkflowTriggerDeactivator {
	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly lifecycleLock: WorkflowPublicationLifecycleLock,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Deactivates all non-webhook triggers with a workflow specific lock
	 */
	@OnLeaderStepdown()
	@OnShutdown()
	async deactivateAllNonWebhookTriggers(): Promise<void> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;

		const lockedWorkflowIds: string[] = [];

		for (const workflowId of this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds()) {
			if (this.lifecycleLock.isLocked(workflowId)) {
				lockedWorkflowIds.push(workflowId);
				continue;
			}
			await this.deactivateWorkflow(workflowId);
		}

		for (const workflowId of lockedWorkflowIds) {
			await this.deactivateWorkflow(workflowId);
		}
	}

	/**
	 * Removes a single workflow's non-webhook triggers under its lifecycle lock. If
	 * the lock can't be acquired within the configured timeout (e.g. a trigger
	 * `closeFunction` is stuck), the workflow is deactivated anyway so demotion is
	 * never blocked, and the timeout is reported.
	 */
	private async deactivateWorkflow(workflowId: string): Promise<void> {
		const { timedOut } = await this.lifecycleLock.runExclusiveOrTimeout(
			workflowId,
			async () => {
				await this.activeWorkflowTriggers.remove(workflowId);
			},
			this.workflowsConfig.triggerLifecycleStepdownTimeoutMs,
		);

		if (timedOut) {
			this.errorReporter.error(
				new UnexpectedError(
					`Timed out waiting for an in-flight publication record for workflow "${workflowId}" before trigger teardown; tore down anyway`,
				),
				{ shouldBeLogged: true },
			);
		}
	}
}
