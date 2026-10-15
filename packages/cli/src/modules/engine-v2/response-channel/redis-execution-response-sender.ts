import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse, ExecutionResponseSender } from '@n8n/engine';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import type { Span } from '@opentelemetry/api';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { UnexpectedError } from 'n8n-workflow';

import { engineTracingEnabled, getEngineTracer, injectEngineTraceHeaders } from '../engine-tracing';

import { serializeExecutionResponse } from './execution-response-frame';
import type { RedisExecutionResponseChannelNameGenerator } from './redis-execution-response-channel';

/**
 * How long (in ms) shutdown waits for in-flight publishes. Redis queues commands
 * while it is down, so an unbounded wait could hold shutdown open.
 */
export const SHUTDOWN_DRAIN_TIMEOUT_MS = 5_000;

export interface RedisResponsePublisher {
	publish(channel: string, message: string): Promise<unknown>;
	disconnect(): void;
}

/** Publishes serialized execution responses to execution-specific Redis channels. */
export class RedisExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	private readonly inFlightPublishes = new Set<Promise<unknown>>();

	private readonly activePublicationSpans = new Set<Span>();

	constructor(
		private readonly publisher: RedisResponsePublisher,
		private readonly getChannelName: RedisExecutionResponseChannelNameGenerator,
		private readonly logger: Logger,
	) {}

	send(response: ExecutionResponse): Result<void, Error> {
		if (this.stopped) {
			return createResultError(new UnexpectedError('The execution response sender has stopped.'));
		}

		if (!engineTracingEnabled()) return this.publishResponse(response);

		return getEngineTracer().startActiveSpan(
			'engine.response.publish',
			{
				kind: SpanKind.PRODUCER,
				attributes: {
					'n8n.execution.id': response.executionId,
					'n8n.response.type': response.type,
				},
			},
			(span) => {
				this.activePublicationSpans.add(span);
				try {
					return this.publishResponse(response, span);
				} catch (error) {
					this.endPublicationSpan(span, true);
					throw error;
				}
			},
		);
	}

	private publishResponse(response: ExecutionResponse, span?: Span): Result<void, Error> {
		const frameResult = serializeExecutionResponse(
			response,
			this.logger,
			undefined,
			injectEngineTraceHeaders(),
		);
		let failed = !frameResult.ok;

		const publishTask: Promise<unknown> = this.publisher
			.publish(this.getChannelName(response.executionId), frameResult.frame)
			.catch((error: unknown) => {
				failed = true;
				this.logger.error('Failed to publish an execution response', {
					executionId: response.executionId,
					error,
				});
			})
			.finally(() => {
				this.endPublicationSpan(span, failed);
				this.inFlightPublishes.delete(publishTask);
			});
		this.inFlightPublishes.add(publishTask);

		return frameResult.ok ? createResultOk(undefined) : createResultError(frameResult.error);
	}

	private endPublicationSpan(span: Span | undefined, failed: boolean): void {
		if (!span || !this.activePublicationSpans.delete(span)) return;

		if (failed) span.setStatus({ code: SpanStatusCode.ERROR });
		span.end();
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		await this.drainInFlightPublishes();
		// Disconnect can reject pending publishes after the tracer provider shuts down.
		for (const span of this.activePublicationSpans) this.endPublicationSpan(span, true);
		this.publisher.disconnect();
	}

	/** Gives in-flight publishes a bounded time to reach Redis before it disconnects. */
	private async drainInFlightPublishes(): Promise<void> {
		if (this.inFlightPublishes.size === 0) return;

		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, SHUTDOWN_DRAIN_TIMEOUT_MS);
		});
		try {
			await Promise.race([Promise.allSettled(this.inFlightPublishes), timeout]);
		} finally {
			clearTimeout(timer);
		}

		if (this.inFlightPublishes.size > 0) {
			this.logger.warn('Execution responses were still being published at shutdown', {
				count: this.inFlightPublishes.size,
			});
		}
	}
}
