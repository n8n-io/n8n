import type { WorkflowsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

// Stub the consumer module: the notifier imports it dynamically, and loading the
// real module pulls in its flag-guarded dependency chain. We only need the class
// token so `Container.get` can be intercepted.
vi.mock('@/workflows/publication/workflow-publication-outbox-consumer', () => ({
	WorkflowPublicationOutboxConsumer: class WorkflowPublicationOutboxConsumer {},
}));

describe('WorkflowPublicationNotifier', () => {
	const errorReporter = mock<ErrorReporter>();
	const publisher = mock<Publisher>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();

	function makeNotifier(isMultiMain: boolean, useWorkflowPublicationService = true) {
		const instanceSettings = mock<InstanceSettings>({ isMultiMain });
		const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
		return new WorkflowPublicationNotifier(
			errorReporter,
			instanceSettings,
			publisher,
			workflowsConfig,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		publisher.publishCommand.mockResolvedValue(undefined);
		outboxConsumer.wakeUp.mockResolvedValue(undefined);
		// The consumer is resolved lazily (dynamic import + Container.get) to keep its
		// flag-guarded dependency chain off the default graph.
		vi.spyOn(Container, 'get').mockReturnValue(outboxConsumer);
	});

	describe('multi-main', () => {
		it('routes the wake-up through pubsub and does not touch the local consumer', () => {
			makeNotifier(true).requestDrain();

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'workflow-publish-wake-up',
			});
			expect(Container.get).not.toHaveBeenCalled();
			expect(outboxConsumer.wakeUp).not.toHaveBeenCalled();
		});
	});

	describe('single-main', () => {
		it('wakes the local consumer directly and does not publish a command', async () => {
			makeNotifier(false).requestDrain();

			await vi.waitFor(() => expect(outboxConsumer.wakeUp).toHaveBeenCalledTimes(1));
			expect(Container.get).toHaveBeenCalledWith(WorkflowPublicationOutboxConsumer);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('publication service disabled', () => {
		it('does nothing (never resolves the consumer nor publishes)', () => {
			makeNotifier(false, false).requestDrain();

			expect(Container.get).not.toHaveBeenCalled();
			expect(outboxConsumer.wakeUp).not.toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	it('reports errors from the wake path instead of throwing (fire-and-forget)', async () => {
		const error = new Error('drain failed');
		outboxConsumer.wakeUp.mockRejectedValue(error);

		expect(() => makeNotifier(false).requestDrain()).not.toThrow();

		await vi.waitFor(() =>
			expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true }),
		);
	});
});
