import { WorkflowsConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

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
			: this.wakeLocalConsumer();

		void wake.catch((error) => this.errorReporter.error(error, { shouldBeLogged: true }));
	}

	/**
	 * Wake the local leader's consumer in-process.
	 *
	 * The consumer module is imported dynamically, never statically: its dependency
	 * chain (WorkflowTriggerActivator) asserts the publication service is enabled in
	 * its constructor, and it registers @OnShutdown/@OnPubSubEvent handlers that the
	 * shutdown/pubsub registries eagerly `Container.get`. Loading it only on this
	 * flag-gated path keeps it off the default graph, matching start.ts. Node caches
	 * the module after the first import, so later calls resolve it from cache.
	 */
	private async wakeLocalConsumer(): Promise<void> {
		const { WorkflowPublicationOutboxConsumer } = await import(
			'./workflow-publication-outbox-consumer.js'
		);
		await Container.get(WorkflowPublicationOutboxConsumer).wakeUp();
	}
}
