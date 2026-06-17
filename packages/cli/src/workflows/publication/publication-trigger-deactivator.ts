import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers, ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';

/**
 * Tears down in-memory triggers on leader stepdown and shutdown when the workflow
 * publication service is enabled — the counterpart to the takeover enqueue. It
 * replaces `ActiveWorkflowManager.removeAllNonWebhookTriggerWorkflows` under the
 * flag so the teardown can coordinate with in-flight outbox records via
 * {@link WorkflowPublicationLifecycleLock}.
 *
 * Teardown goes only through {@link ActiveWorkflowTriggers}: it stops listeners,
 * pollers and schedules but never touches third-party webhook registrations.
 */
@Service()
export class PublicationTriggerDeactivator {
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
	 * Deactivates all non-webhook triggers. Every workflow is torn down under its
	 * own lifecycle lock so teardown never races an in-flight outbox record.
	 * Workflows with no in-flight record are done first (the lock is uncontended);
	 * those currently being processed are deferred and handled last, so an in-flight
	 * record doesn't hold up tearing down everything else.
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
