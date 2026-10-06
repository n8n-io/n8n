import type { StreamResult } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { randomUUID } from 'node:crypto';

import type { Logger } from '../logger';
import { isQuotaExhaustedError, mapAgentChunkToEvent } from './map-chunk';
import { UsageAccumulator, type RunTokenUsage } from './usage-accumulator';
import { WorkSummaryAccumulator, type WorkSummary } from './work-summary-accumulator';
import { parseSuspension } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface ConsumeStreamCascadingOptions {
	agent: unknown;
	stream: unknown;
	runId: string;
	agentId: string;
	logger: Logger;
	threadId: string;
	abortSignal: AbortSignal;
	/** Sees every raw chunk, e.g. to forward sub-agent progress to the parent stream. */
	onChunk?: (chunk: unknown) => void;
}

export type ConsumeStreamCascadingResult =
	| {
			status: 'completed' | 'cancelled' | 'errored';
			agentRunId: string;
			text: Promise<string>;
			workSummary: WorkSummary;
			usage?: RunTokenUsage;
	  }
	| {
			status: 'suspended';
			agentRunId: string;
			suspension: SuspensionInfo;
			confirmationEvent?: ConfirmationRequestEvent;
			text?: Promise<string>;
			workSummary: WorkSummary;
			usage?: RunTokenUsage;
	  };

interface StreamSource {
	runId?: string;
	fullStream: AsyncIterable<unknown>;
	text?: Promise<string>;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, Symbol.asyncIterator) === 'function'
	);
}

function isReadableStream(value: unknown): value is ReadableStream<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'getReader') === 'function'
	);
}

function isStreamSource(value: unknown): value is StreamSource {
	return isRecord(value) && isAsyncIterable(value.fullStream);
}

function isNativeStreamResult(value: unknown): value is StreamResult {
	return isRecord(value) && isReadableStream(value.stream);
}

function extractContentText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content
		.map((part) =>
			isRecord(part) && part.type === 'text' && typeof part.text === 'string' ? part.text : '',
		)
		.join('');
}

async function collectNativeStreamText(stream: ReadableStream<unknown>): Promise<string> {
	const reader = stream.getReader();
	let deltaText = '';
	let messageText = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return deltaText || messageText;
			if (!isRecord(value)) continue;

			if (value.type === 'text-delta' && typeof value.delta === 'string') {
				deltaText += value.delta;
				continue;
			}

			if (value.type === 'message' && isRecord(value.message)) {
				if (value.message.role === 'assistant') {
					messageText += extractContentText(value.message.content);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

async function* readableStreamToAsyncIterable(stream: ReadableStream<unknown>) {
	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}

function normalizeStreamSource(result: unknown): StreamSource {
	if (isStreamSource(result)) return result;

	if (isNativeStreamResult(result)) {
		const [eventStream, textStream] = result.stream.tee();
		return {
			runId: result.runId,
			fullStream: readableStreamToAsyncIterable(eventStream),
			text: collectNativeStreamText(textStream),
		};
	}

	throw new Error('Unsupported agent stream result');
}

function isErrorChunk(chunk: unknown): chunk is { type: 'error'; error?: unknown } {
	return isRecord(chunk) && chunk.type === 'error';
}

/**
 * Consume a sub-agent stream and return cleanly when it either finishes or
 * hits a HITL suspension. This returns the suspension info to the caller so it can decide
 * how to handle it — e.g. cascade the suspension up to its own SDK suspend
 * via `ctx.suspend(payload)`, so the parent's agent run is also checkpointed
 * and survives a process restart.
 *
 * The sub-agent's primary `confirmation-request` event is not published. It
 * is returned on the result instead, so the caller emits the card at whatever
 * runId is meaningful at its level.
 */
export async function consumeStreamCascading(
	options: ConsumeStreamCascadingOptions,
): Promise<ConsumeStreamCascadingResult> {
	const stream = normalizeStreamSource(options.stream);
	const agentRunId = stream.runId ?? '';
	const workSummaryAccumulator = new WorkSummaryAccumulator();
	const usageAccumulator = new UsageAccumulator();
	const usage = () => (usageAccumulator.hasUsage() ? usageAccumulator.toUsage() : undefined);

	let currentResponseId: string | undefined;
	let nativeStepIndex = 0;
	// Segment id for deltas that arrive before a `start-step` (some providers
	// never emit one). Cleared at the next structural chunk.
	let syntheticSegmentId: string | undefined;
	let suspension: SuspensionInfo | undefined;
	let confirmationEvent: ConfirmationRequestEvent | undefined;
	let hasError = false;
	// Drop follow-on error chunks after a quota error, so the user sees one reason.
	let quotaErrorPublished = false;

	for await (const chunk of stream.fullStream) {
		if (options.abortSignal.aborted) {
			// Drain the rest so the usage of the cancelled stream is still observed.
			usageAccumulator.observe(chunk);
			try {
				for await (const remaining of stream.fullStream) usageAccumulator.observe(remaining);
			} catch (drainError) {
				options.logger.debug('Instance AI abort drain ended early', {
					threadId: options.threadId,
					runId: options.runId,
					error: drainError instanceof Error ? drainError.message : String(drainError),
				});
			}
			return {
				status: 'cancelled',
				agentRunId,
				text: stream.text ?? Promise.resolve(''),
				workSummary: workSummaryAccumulator.toSummary(),
				usage: usage(),
			};
		}

		usageAccumulator.observe(chunk);
		options.onChunk?.(chunk);

		if (isRecord(chunk) && chunk.type === 'start-step') {
			nativeStepIndex += 1;
			currentResponseId = `${agentRunId || options.runId}:step:${nativeStepIndex}`;
			syntheticSegmentId = undefined;
		}

		const parsedSuspension = parseSuspension(chunk);
		if (parsedSuspension) {
			if (!suspension) {
				suspension = parsedSuspension;
			} else if (
				parsedSuspension.requestId !== suspension.requestId ||
				parsedSuspension.toolCallId !== suspension.toolCallId
			) {
				options.logger.warn('Additional HITL suspension encountered before resume; deferring', {
					threadId: options.threadId,
					runId: options.runId,
					activeRequestId: suspension.requestId,
					deferredRequestId: parsedSuspension.requestId,
				});
			}
		}

		if (isErrorChunk(chunk)) {
			hasError = true;
			if (quotaErrorPublished) continue;
			if (isQuotaExhaustedError(chunk.error)) quotaErrorPublished = true;
		}

		const isDeltaChunk =
			isRecord(chunk) && (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta');
		if (isDeltaChunk && !currentResponseId && !syntheticSegmentId) {
			syntheticSegmentId = `${agentRunId || options.runId}:seg:${randomUUID()}`;
		}

		const event = mapAgentChunkToEvent(
			options.runId,
			options.agentId,
			chunk,
			currentResponseId ?? syntheticSegmentId,
		);

		const isFinishStep = isRecord(chunk) && chunk.type === 'finish-step';
		if ((event && !isDeltaChunk) || isFinishStep) syntheticSegmentId = undefined;
		if (!event) continue;

		workSummaryAccumulator.observe(event);
		if (event.type === 'confirmation-request') {
			// Hold back the primary card and drop duplicates or secondary cards.
			const isPrimary =
				event.payload.requestId === suspension?.requestId &&
				event.payload.toolCallId === suspension?.toolCallId;
			if (isPrimary && !confirmationEvent) confirmationEvent = event;
			continue;
		}
	}

	if (options.abortSignal.aborted) {
		return {
			status: 'cancelled',
			agentRunId,
			text: stream.text ?? Promise.resolve(''),
			workSummary: workSummaryAccumulator.toSummary(),
			usage: usage(),
		};
	}

	if (suspension) {
		return {
			status: 'suspended',
			agentRunId,
			suspension,
			...(confirmationEvent ? { confirmationEvent } : {}),
			...(stream.text ? { text: stream.text } : {}),
			workSummary: workSummaryAccumulator.toSummary(),
			usage: usage(),
		};
	}

	return {
		status: hasError ? 'errored' : 'completed',
		agentRunId,
		text: stream.text ?? Promise.resolve(''),
		workSummary: workSummaryAccumulator.toSummary(),
		usage: usage(),
	};
}
