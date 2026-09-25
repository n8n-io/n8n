import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse } from '@n8n/engine';
import { UnexpectedError } from 'n8n-workflow';

import { deserializeExecutionResponse } from './execution-response-frame';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';
import type { RedisExecutionResponseChannelNameGenerator } from './redis-execution-response-channel';

type RedisMessageHandler = (channel: string, message: string) => void;

type ExecutionSubscription = {
	executionId: string;
	handler: (response: ExecutionResponse) => void;
	/** Resolves when the channel is ready. Shutdown uses it to wait for in-flight subscriptions. */
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
	private readonly subscriptionsByChannel = new Map<string, ExecutionSubscription>();

	private started = false;

	private stopped = false;

	constructor(
		private readonly subscriber: RedisResponseSubscriber,
		private readonly getChannelName: RedisExecutionResponseChannelNameGenerator,
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
		if (!this.started) {
			throw new UnexpectedError('The execution response receiver has not started');
		}

		const channel = this.getChannelName(executionId);
		if (this.subscriptionsByChannel.has(channel)) {
			throw new UnexpectedError(
				`Execution response receiver already has a subscriber for execution "${executionId}"`,
			);
		}

		const subscription: ExecutionSubscription = {
			executionId,
			handler,
			ready: this.subscriber.subscribe(channel).then(() => {}),
		};
		this.subscriptionsByChannel.set(channel, subscription);
		try {
			await subscription.ready;
		} catch (error) {
			this.subscriptionsByChannel.delete(channel);
			throw error;
		}

		return this.unsubscribeHandler(channel, subscription);
	}

	private unsubscribeHandler(
		channel: string,
		subscription: ExecutionSubscription,
	): UnsubscribeExecutionResponse {
		return () => {
			if (this.stopped || this.subscriptionsByChannel.get(channel) !== subscription) {
				return;
			}

			this.subscriptionsByChannel.delete(channel);
			void this.subscriber.unsubscribe(channel).catch((error: unknown) => {
				this.logger.error('Failed to unsubscribe from execution responses', {
					executionId: subscription.executionId,
					error,
				});
			});
		};
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		const subscriptions = [...this.subscriptionsByChannel.entries()];
		this.subscriptionsByChannel.clear();
		this.subscriber.off('message', this.handleMessage);
		try {
			await Promise.allSettled(
				subscriptions.map(async ([, subscription]) => await subscription.ready),
			);
			await Promise.all(
				subscriptions.map(async ([channel]) => await this.subscriber.unsubscribe(channel)),
			);
		} finally {
			this.subscriber.disconnect();
		}
	}

	private readonly handleMessage: RedisMessageHandler = (channel, frame) => {
		const subscription = this.subscriptionsByChannel.get(channel);
		if (subscription === undefined) return;

		const responseResult = deserializeExecutionResponse(frame, this.logger);
		if (!responseResult.ok) return;
		const response = responseResult.result;

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
}
