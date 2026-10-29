import type {
	ExecutionChannelFrameHandler,
	ExecutionChannelSubscriber,
	ExecutionChannelTopic,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import type { InMemoryExecutionChannel } from './in-memory-execution-response-channel';

export class InMemoryExecutionChannelSubscriber implements ExecutionChannelSubscriber {
	private readonly subscriptions = new Set<UnsubscribeFromExecutionChannel>();

	private stopped = false;

	constructor(private readonly channel: InMemoryExecutionChannel) {}

	async subscribe(
		topic: ExecutionChannelTopic,
		executionId: string,
		handler: ExecutionChannelFrameHandler,
	): Promise<UnsubscribeFromExecutionChannel> {
		if (this.stopped) return () => {};

		const unsubscribeFromChannel = this.channel.subscribe(topic, executionId, handler);
		const unsubscribe = () => {
			unsubscribeFromChannel();
			this.subscriptions.delete(unsubscribe);
		};
		this.subscriptions.add(unsubscribe);

		return unsubscribe;
	}

	async stop(): Promise<void> {
		this.stopped = true;
		for (const unsubscribe of this.subscriptions) unsubscribe();
	}
}
