import type { Logger } from '@n8n/backend-common';
import { executionResponseSchema, type ExecutionResponse } from '@n8n/engine';
import { UnexpectedError } from 'n8n-workflow';

import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';
import { getRedisExecutionResponseChannel } from './redis-execution-response-channel';

type RedisMessageHandler = (channel: string, message: string) => void;

type ExecutionSubscription = {
	handler: (response: ExecutionResponse) => void;
	ready: Promise<void>;
};

export interface RedisResponseSubscriber {
	subscribe(channel: string): Promise<unknown>;
	unsubscribe(channel: string): Promise<unknown>;
	on(event: 'message', handler: RedisMessageHandler): unknown;
	off(event: 'message', handler: RedisMessageHandler): unknown;
	disconnect(): void;
}

export class RedisExecutionResponseReceiver implements ExecutionResponseReceiver {
	private readonly subscriptionsByExecutionId = new Map<string, ExecutionSubscription>();

	private started = false;

	private stopped = false;

	constructor(
		private readonly subscriber: RedisResponseSubscriber,
		private readonly channelPrefix: string,
		private readonly logger: Logger,
	) {}

	async start(): Promise<void> {
		if (this.started || this.stopped) return;

		this.subscriber.on('message', this.handleMessage);
		this.started = true;
	}

	async receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): Promise<UnsubscribeExecutionResponse> {
		if (this.stopped) return () => {};

		if (this.subscriptionsByExecutionId.has(executionId)) {
			throw new UnexpectedError(
				`Execution response receiver already has a subscriber for execution "${executionId}"`,
			);
		}

		const subscription: ExecutionSubscription = {
			handler,
			ready: this.subscriber
				.subscribe(getRedisExecutionResponseChannel(this.channelPrefix, executionId))
				.then(() => {}),
		};
		this.subscriptionsByExecutionId.set(executionId, subscription);
		try {
			await subscription.ready;
		} catch (error) {
			this.subscriptionsByExecutionId.delete(executionId);
			throw error;
		}

		return this.unsubscribeHandler(executionId, subscription);
	}

	private unsubscribeHandler(
		executionId: string,
		subscription: ExecutionSubscription,
	): UnsubscribeExecutionResponse {
		return () => {
			if (this.stopped || this.subscriptionsByExecutionId.get(executionId) !== subscription) {
				return;
			}

			this.subscriptionsByExecutionId.delete(executionId);
			void this.subscriber
				.unsubscribe(getRedisExecutionResponseChannel(this.channelPrefix, executionId))
				.catch((error: unknown) => {
					this.logger.error('Failed to unsubscribe from execution responses', {
						executionId,
						error,
					});
				});
		};
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		const subscriptions = [...this.subscriptionsByExecutionId.entries()];
		this.subscriptionsByExecutionId.clear();
		this.subscriber.off('message', this.handleMessage);
		try {
			await Promise.allSettled(
				subscriptions.map(async ([, subscription]) => await subscription.ready),
			);
			await Promise.all(
				subscriptions.map(
					async ([executionId]) =>
						await this.subscriber.unsubscribe(
							getRedisExecutionResponseChannel(this.channelPrefix, executionId),
						),
				),
			);
		} finally {
			this.subscriber.disconnect();
		}
	}

	private readonly handleMessage: RedisMessageHandler = (channel, frame) => {
		const executionId = this.executionIdFrom(channel);
		if (executionId === undefined) return;

		const subscription = this.subscriptionsByExecutionId.get(executionId);
		if (subscription === undefined) return;

		const response = this.fromFrame(frame);
		if (response === undefined) return;

		try {
			subscription.handler(response);
		} catch (error) {
			this.logger.error('An execution response handler failed', {
				executionId: response.executionId,
				type: response.type,
				error,
			});
		}
	};
	private executionIdFrom(channel: string): string | undefined {
		const prefix = `${this.channelPrefix}:`;
		return channel.startsWith(prefix) ? channel.slice(prefix.length) : undefined;
	}

	private fromFrame(frame: string): ExecutionResponse | undefined {
		try {
			const parsed = executionResponseSchema.safeParse(JSON.parse(frame));
			if (!parsed.success) {
				this.logger.error('Discarding a malformed execution response', {
					details: parsed.error.flatten(),
				});
				return undefined;
			}

			return parsed.data;
		} catch (error) {
			this.logger.error('Discarding an unreadable execution response', { error });
			return undefined;
		}
	}
}
