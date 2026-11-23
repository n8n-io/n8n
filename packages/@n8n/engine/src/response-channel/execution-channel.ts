import type { Result } from '@n8n/utils/result';

/**
 * The kinds of messages that an execution channel carries. Each topic has its
 * own subscription, so the subscribers of one topic do not get the frames of
 * another topic.
 */
export const EXECUTION_CHANNEL_TOPICS = ['responses', 'lifecycle'] as const;

/** The largest frame that the endpoints publish. Every transport must carry it. */
export const MAX_FRAME_BYTES = 5 * 1024 * 1024;

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

/**
 * The frame to publish. A failed result can still have a frame, so the codec
 * can replace a message that it cannot deliver with one that it can. Without a
 * frame, the sender publishes nothing.
 */
export type FrameResult = { ok: true; frame: string } | { ok: false; frame?: string; error: Error };

/** Converts the messages of one topic to frames and back. */
export interface ExecutionChannelCodec<T> {
	readonly topic: ExecutionChannelTopic;
	executionIdOf(message: T): string;
	serialize(message: T): FrameResult;
	deserialize(frame: string): Result<T, Error>;
}
