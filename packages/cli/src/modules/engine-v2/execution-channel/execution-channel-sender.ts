import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import type {
	ExecutionChannelCodec,
	ExecutionChannelPublisher,
	ExecutionChannelTopic,
} from './execution-channel';
import type { InMemoryExecutionChannel } from './in-memory-execution-channel';

/** Sends messages on the topic of its codec. */
export class ExecutionChannelSender<T> {
	private stopped = false;

	constructor(
		private readonly publisher: ExecutionChannelPublisher,
		private readonly codec: ExecutionChannelCodec<T>,
	) {}

	send(message: T): Result<void, Error> {
		if (this.stopped) {
			return createResultError(new UnexpectedError('The execution channel sender has stopped.'));
		}

		const frameResult = this.codec.serialize(message);
		this.publisher.publish(this.codec.topic, this.codec.executionIdOf(message), frameResult.frame);

		return frameResult.ok ? createResultOk(undefined) : createResultError(frameResult.error);
	}

	/** Stops sending. The owner of the publisher releases its connection. */
	async stop(): Promise<void> {
		this.stopped = true;
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
