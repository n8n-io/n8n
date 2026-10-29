import type { Logger } from '@n8n/backend-common';
import type { LifecycleEvent, LifecycleEventBatch } from '@n8n/engine';

import type { ExecutionChannelPublisher } from './execution-channel';
import { ExecutionChannelSender } from './execution-channel-sender';
import { createLifecycleEventCodec, splitLifecycleEvents } from './lifecycle-event-frame';

/**
 * Sends lifecycle events on the `lifecycle` topic of the execution channel.
 *
 * The engine batches the events of many executions, and each execution has its
 * own channel. Thus this splits a batch by execution, keeps the order of the
 * events of each execution, and splits the events of one execution into
 * batches that fit a frame.
 */
export class LifecycleEventChannelSender {
	private readonly sender: ExecutionChannelSender<LifecycleEventBatch>;

	constructor(
		publisher: ExecutionChannelPublisher,
		private readonly logger: Logger,
		private readonly maxFrameBytes?: number,
	) {
		this.sender = new ExecutionChannelSender(
			publisher,
			createLifecycleEventCodec(logger, maxFrameBytes),
		);
	}

	/** Matches `LifecycleEventCallback`. Publishing does not wait, so the signal is not used. */
	async send(events: LifecycleEvent[], _signal?: AbortSignal): Promise<void> {
		for (const executionEvents of groupByExecution(events)) {
			for (const batch of splitLifecycleEvents(executionEvents, this.logger, this.maxFrameBytes)) {
				this.sender.send(batch);
			}
		}
	}
}

function groupByExecution(events: LifecycleEvent[]): Iterable<LifecycleEvent[]> {
	const groups = new Map<string, LifecycleEvent[]>();
	for (const event of events) {
		const group = groups.get(event.executionId);
		if (group) group.push(event);
		else groups.set(event.executionId, [event]);
	}

	return groups.values();
}
