/**
 * The kinds of messages that an execution channel carries. Each topic has its
 * own subscription, so the subscribers of one topic do not get the frames of
 * another topic.
 */
export const EXECUTION_CHANNEL_TOPICS = ['responses', 'lifecycle'] as const;

export type ExecutionChannelTopic = (typeof EXECUTION_CHANNEL_TOPICS)[number];

export type UnsubscribeFromExecutionChannel = () => void;

export type ExecutionChannelFrameHandler = (frame: string) => void;

/** The data plane end of the execution channel. It publishes serialized frames. */
export interface ExecutionChannelPublisher {
	publish(topic: ExecutionChannelTopic, executionId: string, frame: string): void;
	stop(): Promise<void>;
}

/** The control plane end of the execution channel. It delivers serialized frames. */
export interface ExecutionChannelSubscriber {
	/** Resolves when the subscription is active, so no frame published after it is lost. */
	subscribe(
		topic: ExecutionChannelTopic,
		executionId: string,
		handler: ExecutionChannelFrameHandler,
	): Promise<UnsubscribeFromExecutionChannel>;
	stop(): Promise<void>;
}
