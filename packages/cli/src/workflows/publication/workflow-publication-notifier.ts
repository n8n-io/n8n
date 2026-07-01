import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { WorkflowPublicationOutboxConsumer } from './workflow-publication-outbox-consumer';

/**
 * Signals the leader to drain the publication outbox immediately after a record
 * is enqueued, instead of waiting for the next poll cycle.
 *
 * Fire-and-forget by design: publication is asynchronous, so the enqueue path
 * must not block on the drain.
 */
@Service()
export class WorkflowPublicationNotifier {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
	) {}

	/** Wake the leader's outbox consumer so a freshly enqueued record is drained promptly. */
	requestDrain(): void {
		const wake = this.instanceSettings.isMultiMain
			? this.publisher.publishCommand({ command: 'workflow-publish-wake-up' })
			: this.outboxConsumer.wakeUp();

		void wake.catch((error) => this.errorReporter.error(error, { shouldBeLogged: true }));
	}
}
