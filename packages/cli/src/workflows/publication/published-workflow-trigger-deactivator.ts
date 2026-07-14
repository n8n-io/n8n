import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers, ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

/**
 * How long teardown waits for an in-flight publication record to finish before
 * deactivating a workflow's triggers anyway, so a hung trigger `closeFunction`
 * cannot block leader demotion.
 */
const STEPDOWN_TEARDOWN_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;

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
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
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

		this.outboxConsumer.stopPolling();

		// Include workflow ids that only exist in the lifecycle lock: a first activation
		// can be in-flight before any local triggers or crons are registered.
		const workflowIds = new Set([
			...this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds(),
			...this.lifecycleLock.getLockedWorkflowIds(),
		]);
		const lockedWorkflowIds: string[] = [];

		for (const workflowId of workflowIds) {
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
	 * the lock can't be acquired within {@link STEPDOWN_TEARDOWN_TIMEOUT_MS} (e.g. a
	 * trigger `closeFunction` is stuck), the workflow is deactivated anyway so
	 * demotion is never blocked, and the timeout is reported.
	 */
	private async deactivateWorkflow(workflowId: string): Promise<void> {
		const { timedOut } = await this.lifecycleLock.runExclusiveOrTimeout(
			workflowId,
			async () => {
				await this.activeWorkflowTriggers.remove(workflowId);
			},
			STEPDOWN_TEARDOWN_TIMEOUT_MS,
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
