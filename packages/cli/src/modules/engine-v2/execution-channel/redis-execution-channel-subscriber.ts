import type { Logger } from '@n8n/backend-common';
import { UnexpectedError } from 'n8n-workflow';

import type {
	ExecutionChannelFrameHandler,
	ExecutionChannelSubscriber,
	ExecutionChannelTopic,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import type { RedisExecutionChannelNameGenerator } from './redis-execution-channel';

type RedisMessageHandler = (channel: string, message: string) => void;

type RedisConnectionHandler = () => void;

type ChannelSubscription = {
	topic: ExecutionChannelTopic;
	executionId: string;
	handler: ExecutionChannelFrameHandler;
};

export interface RedisChannelSubscriber {
	subscribe(...channels: string[]): Promise<unknown>;
	unsubscribe(channel: string): Promise<unknown>;
	on(event: 'close' | 'ready', handler: RedisConnectionHandler): unknown;
	on(event: 'message', handler: RedisMessageHandler): unknown;
	off(event: 'close' | 'ready', handler: RedisConnectionHandler): unknown;
	off(event: 'message', handler: RedisMessageHandler): unknown;
	disconnect(): void;
}

/**
 * Subscribes to execution-specific Redis channels on one connection. Each topic
 * of an execution has its own Redis channel, with one subscriber.
 */
export class RedisExecutionChannelSubscriber implements ExecutionChannelSubscriber {
	private readonly subscriptionsByChannel = new Map<string, ChannelSubscription>();

	private started = false;

	private stopped = false;

	private lostConnection = false;

	constructor(
		private readonly subscriber: RedisChannelSubscriber,
		private readonly getChannelName: RedisExecutionChannelNameGenerator,
		private readonly logger: Logger,
	) {}

	async start(): Promise<void> {
		if (this.started || this.stopped) return;

		this.subscriber.on('message', this.handleMessage);
		this.subscriber.on('close', this.handleClose);
		this.subscriber.on('ready', this.handleReady);
		this.started = true;
	}

	async subscribe(
		topic: ExecutionChannelTopic,
		executionId: string,
		handler: ExecutionChannelFrameHandler,
	): Promise<UnsubscribeFromExecutionChannel> {
		if (this.stopped) return () => {};
		if (!this.started) {
			throw new UnexpectedError('The execution channel subscriber has not started');
		}

		const channel = this.getChannelName(topic, executionId);
		if (this.subscriptionsByChannel.has(channel)) {
			throw new UnexpectedError(
				`The execution channel already has a subscriber for "${topic}" of execution "${executionId}"`,
			);
		}

		const subscription: ChannelSubscription = { topic, executionId, handler };
		this.subscriptionsByChannel.set(channel, subscription);
		try {
			await this.subscriber.subscribe(channel);
		} catch (error) {
			if (this.subscriptionsByChannel.get(channel) === subscription) {
				this.subscriptionsByChannel.delete(channel);
			}
			throw error;
		}

		return this.unsubscribeHandler(channel, subscription);
	}

	private unsubscribeHandler(
		channel: string,
		subscription: ChannelSubscription,
	): UnsubscribeFromExecutionChannel {
		return () => {
			if (this.stopped || this.subscriptionsByChannel.get(channel) !== subscription) {
				return;
			}

			this.subscriptionsByChannel.delete(channel);
			void this.subscriber.unsubscribe(channel).catch((error: unknown) => {
				this.logger.error('Failed to unsubscribe from the execution channel', {
					topic: subscription.topic,
					executionId: subscription.executionId,
					error,
				});
			});
		};
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		this.subscriptionsByChannel.clear();
		this.subscriber.off('message', this.handleMessage);
		this.subscriber.off('close', this.handleClose);
		this.subscriber.off('ready', this.handleReady);
		// Closing the connection ends every Redis subscription, so there is nothing to
		// unsubscribe. Waiting for Redis here could hold shutdown open while it is down.
		this.subscriber.disconnect();
	}

	private readonly handleClose: RedisConnectionHandler = () => {
		this.lostConnection = true;
	};

	/**
	 * ioredis replays SUBSCRIBE on reconnect without awaiting it, so a failed
	 * replay leaves the connection ready with zero subscriptions. Re-issue our
	 * own on every recovery. SUBSCRIBE is idempotent.
	 */
	private readonly handleReady: RedisConnectionHandler = () => {
		if (!this.lostConnection) return;

		this.lostConnection = false;
		void this.resubscribe();
	};

	private async resubscribe(): Promise<void> {
		const channels = Array.from(this.subscriptionsByChannel.keys());
		if (channels.length === 0) return;

		try {
			await this.subscriber.subscribe(...channels);
		} catch (error) {
			this.lostConnection = true;
			this.logger.error('Failed to resubscribe to the execution channel after Redis reconnect', {
				error,
			});
		}
	}

	private readonly handleMessage: RedisMessageHandler = (channel, frame) => {
		const subscription = this.subscriptionsByChannel.get(channel);
		if (subscription === undefined) return;

		try {
			subscription.handler(frame);
		} catch (error) {
			this.logger.error('An execution channel frame handler failed', {
				topic: subscription.topic,
				executionId: subscription.executionId,
				error,
			});
		}
	};
}
