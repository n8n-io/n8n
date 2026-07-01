import { WorkflowsConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { WorkflowPublicationOutboxConsumer } from './workflow-publication-outbox-consumer';

/**
 * Signals the leader to drain the publication outbox immediately after a record
 * is enqueued, instead of waiting for the next poll cycle.
 */
@Service()
export class WorkflowPublicationNotifier {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly workflowsConfig: WorkflowsConfig,
	) {}

	/**
	 * Wake the leader's outbox consumer so a freshly enqueued record is drained promptly.
	 *
	 * NOTE: this should only be called after a record is successfully enqueued,
	 * otherwise we might try to drain the record before it's actually created.
	 */
	requestDrain(): void {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;

		const wake = this.instanceSettings.isMultiMain
			? this.publisher.publishCommand({ command: 'workflow-publish-wake-up' })
			: // Resolve the consumer lazily: its dependency chain (WorkflowTriggerActivator)
				// asserts the publication service is enabled in its constructor, so it must
				// only ever be constructed on this flag-gated path, never eagerly via DI.
				Container.get(WorkflowPublicationOutboxConsumer).wakeUp();

		void wake.catch((error) => this.errorReporter.error(error, { shouldBeLogged: true }));
	}
}
