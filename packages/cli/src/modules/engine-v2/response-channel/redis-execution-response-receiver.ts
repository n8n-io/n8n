import type { Logger } from '@n8n/backend-common';
import { executionResponseSchema, type ExecutionResponse } from '@n8n/engine';

import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';

type RedisMessageHandler = (pattern: string, channel: string, message: string) => void;

export interface RedisResponseSubscriber {
	psubscribe(pattern: string): Promise<unknown>;
	punsubscribe(pattern: string): Promise<unknown>;
	on(event: 'pmessage', handler: RedisMessageHandler): unknown;
	off(event: 'pmessage', handler: RedisMessageHandler): unknown;
	disconnect(): void;
}

export class RedisExecutionResponseReceiver implements ExecutionResponseReceiver {
	private readonly handlers = new Map<string, Set<(response: ExecutionResponse) => void>>();

	private readonly pattern: string;

	private started = false;

	private stopped = false;

	constructor(
		private readonly subscriber: RedisResponseSubscriber,
		private readonly channelPrefix: string,
		private readonly logger: Logger,
	) {
		this.pattern = `${channelPrefix}:*`;
	}

	async start(): Promise<void> {
		if (this.started || this.stopped) return;

		this.subscriber.on('pmessage', this.handleMessage);
		try {
			await this.subscriber.psubscribe(this.pattern);
			this.started = true;
		} catch (error) {
			this.subscriber.off('pmessage', this.handleMessage);
			this.subscriber.disconnect();
			throw error;
		}
	}

	receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): UnsubscribeExecutionResponse {
		if (this.stopped) return () => {};

		const handlers = this.handlers.get(executionId) ?? new Set();
		handlers.add(handler);
		this.handlers.set(executionId, handlers);

		return () => {
			handlers.delete(handler);
			if (handlers.size === 0) this.handlers.delete(executionId);
		};
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		this.handlers.clear();
		this.subscriber.off('pmessage', this.handleMessage);
		try {
			if (this.started) await this.subscriber.punsubscribe(this.pattern);
		} finally {
			this.subscriber.disconnect();
		}
	}

	private readonly handleMessage: RedisMessageHandler = (_pattern, channel, frame) => {
		const executionId = this.executionIdFrom(channel);
		if (executionId === undefined) return;

		const handlers = this.handlers.get(executionId);
		if (handlers === undefined) return;

		const response = this.fromFrame(frame);
		if (response === undefined) return;

		for (const handler of handlers) {
			try {
				handler(response);
			} catch (error) {
				this.logger.error('An execution response handler failed', {
					executionId: response.executionId,
					type: response.type,
					error,
				});
			}
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
