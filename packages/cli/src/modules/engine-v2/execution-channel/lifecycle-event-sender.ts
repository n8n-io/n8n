import type { Logger } from '@n8n/backend-common';
import type { LifecycleEvent } from '@n8n/engine';

import type { ExecutionChannelPublisher } from './execution-channel';
import { ExecutionChannelSender } from './execution-channel-sender';
import { createLifecycleEventCodec } from './lifecycle-event-frame';

/**
 * Sends lifecycle events on the `lifecycle` topic of the execution channel,
 * one event for each frame, in the order the engine reports them.
 */
export class LifecycleEventChannelSender {
	private readonly sender: ExecutionChannelSender<LifecycleEvent>;

	constructor(publisher: ExecutionChannelPublisher, logger: Logger, maxFrameBytes?: number) {
		this.sender = new ExecutionChannelSender(
			publisher,
			createLifecycleEventCodec(logger, maxFrameBytes),
		);
	}

	/** Matches `LifecycleEventCallback`. Publishing does not wait, so the signal is not used. */
	async send(events: LifecycleEvent[], _signal?: AbortSignal): Promise<void> {
		for (const event of events) this.sender.send(event);
	}
}
