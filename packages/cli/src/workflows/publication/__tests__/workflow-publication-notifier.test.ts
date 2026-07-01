import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import type { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

describe('WorkflowPublicationNotifier', () => {
	const errorReporter = mock<ErrorReporter>();
	const publisher = mock<Publisher>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();

	function makeNotifier(isMultiMain: boolean) {
		const instanceSettings = mock<InstanceSettings>({ isMultiMain });
		return new WorkflowPublicationNotifier(
			errorReporter,
			instanceSettings,
			publisher,
			outboxConsumer,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		publisher.publishCommand.mockResolvedValue(undefined);
		outboxConsumer.wakeUp.mockResolvedValue(undefined);
	});

	describe('multi-main', () => {
		it('routes the wake-up through pubsub and does not touch the local consumer', () => {
			makeNotifier(true).requestDrain();

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'workflow-publish-wake-up',
			});
			expect(outboxConsumer.wakeUp).not.toHaveBeenCalled();
		});
	});

	describe('single-main', () => {
		it('wakes the local consumer directly and does not publish a command', () => {
			makeNotifier(false).requestDrain();

			expect(outboxConsumer.wakeUp).toHaveBeenCalledTimes(1);
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
