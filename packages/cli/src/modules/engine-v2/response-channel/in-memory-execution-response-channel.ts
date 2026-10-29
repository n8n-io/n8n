import { EventEmitter } from 'node:events';

import type {
	ExecutionChannelFrameHandler,
	ExecutionChannelPublisher,
	ExecutionChannelTopic,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import { InMemoryExecutionChannelSubscriber } from './in-memory-execution-response-receiver';

/** Carries serialized frames between the endpoints of the channel in this process. */
export class InMemoryExecutionChannel {
	private readonly emitter = new EventEmitter();

	publish(topic: ExecutionChannelTopic, executionId: string, frame: string): void {
		this.emitter.emit(eventName(topic, executionId), frame);
	}

	subscribe(
		topic: ExecutionChannelTopic,
		executionId: string,
		handler: ExecutionChannelFrameHandler,
	): UnsubscribeFromExecutionChannel {
		const event = eventName(topic, executionId);
		this.emitter.on(event, handler);
		return () => this.emitter.off(event, handler);
	}
}

export class InMemoryExecutionChannelPublisher implements ExecutionChannelPublisher {
	private stopped = false;

	constructor(private readonly channel: InMemoryExecutionChannel) {}

	publish(topic: ExecutionChannelTopic, executionId: string, frame: string): void {
		if (this.stopped) return;

		this.channel.publish(topic, executionId, frame);
	}

	async stop(): Promise<void> {
		this.stopped = true;
	}
}

/** Creates both endpoints of one in-memory channel. */
export function createInMemoryExecutionChannel() {
	const channel = new InMemoryExecutionChannel();

	return {
		publisher: new InMemoryExecutionChannelPublisher(channel),
		subscriber: new InMemoryExecutionChannelSubscriber(channel),
	};
}

function eventName(topic: ExecutionChannelTopic, executionId: string) {
	return `${topic}:${executionId}`;
}
