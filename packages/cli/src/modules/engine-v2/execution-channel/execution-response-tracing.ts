import type {
	ExecutionChannelCodec,
	ExecutionResponse,
	ExecutionResponseSender,
} from '@n8n/engine';
import { UnexpectedError } from '@n8n/errors';
import { createResultError, createResultOk } from '@n8n/utils/result';
import { context, SpanKind, SpanStatusCode } from '@opentelemetry/api';

import {
	engineTracingEnabled,
	extractEngineTraceContext,
	getEngineTracer,
	runEngineSpanSync,
} from '../engine-tracing';

import { ExecutionChannelSender } from './execution-channel-sender';
import { traceHeadersOf } from './execution-response-frame';
import type { ExecutionResponseReceiver } from './execution-response-receiver';
import type { RedisExecutionChannelPublisher } from './redis-execution-channel-publisher';

function responseAttributes(response: ExecutionResponse) {
	return {
		'n8n.execution.id': response.executionId,
		'n8n.response.type': response.type,
	};
}

/**
 * Sends responses over Redis. With engine tracing on, each publication gets a
 * PRODUCER span that ends when Redis acknowledges the frame or shutdown gives
 * up on it. The span is active while the codec serializes the response, so
 * the frame carries it as the parent context.
 */
export function createExecutionResponseSender(
	publisher: RedisExecutionChannelPublisher,
	codec: ExecutionChannelCodec<ExecutionResponse>,
): ExecutionResponseSender {
	if (!engineTracingEnabled()) return new ExecutionChannelSender(publisher, codec);

	let stopped = false;
	return {
		send(response) {
			if (stopped) {
				return createResultError(new UnexpectedError('The execution channel sender has stopped.'));
			}

			return getEngineTracer().startActiveSpan(
				'engine.response.publish',
				{ kind: SpanKind.PRODUCER, attributes: responseAttributes(response) },
				(span) => {
					let ended = false;
					const end = (failed: boolean) => {
						if (ended) return;
						ended = true;
						if (failed) span.setStatus({ code: SpanStatusCode.ERROR });
						span.end();
					};
					try {
						const frameResult = codec.serialize(response);
						if (frameResult.frame === undefined) {
							end(true);
						} else {
							publisher.publish(codec.topic, codec.executionIdOf(response), frameResult.frame, {
								settled: (failed) => end(failed || !frameResult.ok),
							});
						}
						return frameResult.ok
							? createResultOk(undefined)
							: createResultError(frameResult.error);
					} catch (error) {
						end(true);
						throw error;
					}
				},
			);
		},
		stop: async () => {
			stopped = true;
		},
	};
}

/** Runs each response handler in a CONSUMER span that continues the publisher's trace. */
export function traceExecutionResponseReceiver(
	receiver: ExecutionResponseReceiver,
): ExecutionResponseReceiver {
	if (!engineTracingEnabled()) return receiver;

	return {
		async receive(executionId, handler) {
			return await receiver.receive(executionId, (response) => {
				context.with(extractEngineTraceContext(traceHeadersOf(response)), () =>
					runEngineSpanSync(
						'engine.response.receive',
						responseAttributes(response),
						() => handler(response),
						SpanKind.CONSUMER,
					),
				);
			});
		},
		stop: async () => await receiver.stop(),
	};
}
