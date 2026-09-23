import type { Logger } from '@n8n/backend-common';
import { executionResponseSchema, type ExecutionResponse } from '@n8n/engine';
import { UnexpectedError } from 'n8n-workflow';

import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';

type RedisMessageHandler = (channel: string, message: string) => void;

export interface RedisResponseSubscriber {
	subscribe(channel: string): Promise<unknown>;
	unsubscribe(channel: string): Promise<unknown>;
	on(event: 'message', handler: RedisMessageHandler): unknown;
	off(event: 'message', handler: RedisMessageHandler): unknown;
	disconnect(): void;
}

export class RedisExecutionResponseReceiver implements ExecutionResponseReceiver {
	private readonly handlers = new Map<string, (response: ExecutionResponse) => void>();

	private readonly subscriptions = new Map<string, Promise<void>>();

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

		if (this.handlers.has(executionId)) {
			throw new UnexpectedError(
				`Execution response receiver already has a subscriber for execution "${executionId}"`,
			);
		}

		this.handlers.set(executionId, handler);
		const subscription = this.subscriber.subscribe(this.channelFor(executionId)).then(() => {});
		this.subscriptions.set(executionId, subscription);
		try {
			await subscription;
		} catch (error) {
			this.handlers.delete(executionId);
			this.subscriptions.delete(executionId);
			throw error;
		}

		return this.unsubscribeHandler(executionId, handler);
	}

	private unsubscribeHandler(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): UnsubscribeExecutionResponse {
		return () => {
			if (this.stopped || this.handlers.get(executionId) !== handler) return;

			this.handlers.delete(executionId);
			this.subscriptions.delete(executionId);
			void this.subscriber.unsubscribe(this.channelFor(executionId)).catch((error: unknown) => {
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
		const executionIds = [...this.handlers.keys()];
		this.handlers.clear();
		this.subscriber.off('message', this.handleMessage);
		try {
			await Promise.allSettled(this.subscriptions.values());
			await Promise.all(
				executionIds.map(
					async (executionId) => await this.subscriber.unsubscribe(this.channelFor(executionId)),
				),
			);
		} finally {
			this.subscriptions.clear();
			this.subscriber.disconnect();
		}
	}

	private readonly handleMessage: RedisMessageHandler = (channel, frame) => {
		const executionId = this.executionIdFrom(channel);
		if (executionId === undefined) return;

		const handler = this.handlers.get(executionId);
		if (handler === undefined) return;

		const response = this.fromFrame(frame);
		if (response === undefined) return;

		try {
			handler(response);
		} catch (error) {
			this.logger.error('An execution response handler failed', {
				executionId: response.executionId,
				type: response.type,
				error,
			});
		}
	};

	private channelFor(executionId: string): string {
		return `${this.channelPrefix}:${executionId}`;
	}

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
