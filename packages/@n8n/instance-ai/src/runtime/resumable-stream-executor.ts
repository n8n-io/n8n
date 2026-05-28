import type { StreamResult } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import { mapAgentChunkToEvent } from '../stream/map-chunk';
import { WorkSummaryAccumulator, type WorkSummary } from '../stream/work-summary-accumulator';
import { parseSuspension, resumeAgentStream } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface ResumableStreamSource {
	runId?: string;
	fullStream: AsyncIterable<unknown>;
	text?: Promise<string>;
	steps?: Promise<unknown[]>;
	response?: Promise<unknown>;
	finishReason?: Promise<string | undefined>;
	request?: Promise<unknown>;
	usage?: Promise<unknown>;
	totalUsage?: Promise<unknown>;
}

export interface ResumableStreamContext {
	threadId: string;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	signal: AbortSignal;
	logger: Logger;
	onActivity?: () => void;
}

export interface ManualSuspensionControl {
	mode: 'manual';
}

export interface AutoResumeControl {
	mode: 'auto';
	waitForConfirmation: (requestId: string) => Promise<Record<string, unknown>>;
	drainCorrections?: () => string[];
	/** Returns a promise that resolves when a new user correction is queued. Used to unblock
	 *  HITL suspensions so the builder can incorporate the correction instead of waiting forever. */
	waitForCorrection?: () => Promise<void>;
	onSuspension?: (suspension: SuspensionInfo) => void;
	buildResumeOptions?: (input: {
		agentRunId: string;
		suspension: SuspensionInfo;
	}) => Record<string, unknown>;
}

export type ResumableStreamControl = ManualSuspensionControl | AutoResumeControl;

export interface ExecuteResumableStreamOptions {
	agent: unknown;
	stream: ResumableStreamSource;
	context: ResumableStreamContext;
	control: ResumableStreamControl;
	initialAgentRunId?: string;
}

export type TraceStatus = 'completed' | 'cancelled' | 'suspended' | 'errored';

export interface ExecuteResumableStreamResult {
	status: TraceStatus;
	agentRunId: string;
	text?: Promise<string>;
	suspension?: SuspensionInfo;
	confirmationEvent?: ConfirmationRequestEvent;
	/** Accumulated tool call outcomes observed during stream consumption. */
	workSummary: WorkSummary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function isResumableStreamSource(value: unknown): value is ResumableStreamSource {
	return isRecord(value) && isAsyncIterable(value.fullStream);
}

function isNativeStreamResult(value: unknown): value is StreamResult {
	return isRecord(value) && isReadableStream(value.stream);
}

function extractContentText(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}

	if (!Array.isArray(content)) {
		return '';
	}

	return content
		.map((part) => {
			if (!isRecord(part) || part.type !== 'text') {
				return '';
			}

			return typeof part.text === 'string' ? part.text : '';
		})
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

			if (!isRecord(value)) {
				continue;
			}

			if (value.type === 'text-delta' && typeof value.delta === 'string') {
				deltaText += value.delta;
				continue;
			}

			if (value.type !== 'message' || !isRecord(value.message)) {
				continue;
			}

			if (value.message.role === 'assistant') {
				messageText += extractContentText(value.message.content);
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

export function normalizeStreamSource(result: unknown): ResumableStreamSource {
	if (isResumableStreamSource(result)) {
		return result;
	}

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

export async function executeResumableStream(
	options: ExecuteResumableStreamOptions,
): Promise<ExecuteResumableStreamResult> {
	let activeStream = options.stream.fullStream;
	let activeAgentRunId = options.stream.runId ?? options.initialAgentRunId ?? '';
	let text = options.stream.text;
	const workSummaryAccumulator = new WorkSummaryAccumulator();

	let currentResponseId: string | undefined;
	let nativeStepIndex = 0;

	while (true) {
		let suspension: SuspensionInfo | undefined;
		let hasError = false;
		let pendingConfirmation: Promise<Record<string, unknown>> | undefined;
		let confirmationEvent: ConfirmationRequestEvent | undefined;
		let confirmationEventPublished = false;
		const drainedCorrectionsForResume: string[] = [];
		for await (const chunk of activeStream) {
			if (options.context.signal.aborted) {
				return {
					status: 'cancelled',
					agentRunId: activeAgentRunId,
					text,
					workSummary: workSummaryAccumulator.toSummary(),
				};
			}

			options.context.onActivity?.();

			if (isRecord(chunk) && chunk.type === 'start-step') {
				nativeStepIndex += 1;
				const responseRunId = activeAgentRunId || options.context.runId;
				currentResponseId = `${responseRunId}:step:${nativeStepIndex}`;
			}

			const parsedSuspension = parseSuspension(chunk);
			if (parsedSuspension) {
				if (!suspension) {
					suspension = parsedSuspension;
					if (options.control.mode === 'auto') {
						options.control.onSuspension?.(parsedSuspension);
						pendingConfirmation = options.control.waitForConfirmation(parsedSuspension.requestId);
					}
				} else if (!isSameSuspension(parsedSuspension, suspension)) {
					options.context.logger.warn(
						'Additional HITL suspension encountered before resume; deferring',
						{
							threadId: options.context.threadId,
							runId: options.context.runId,
							activeRequestId: suspension.requestId,
							deferredRequestId: parsedSuspension.requestId,
							activeToolCallId: suspension.toolCallId,
							deferredToolCallId: parsedSuspension.toolCallId,
						},
					);
				}
			}

			if (isErrorChunk(chunk)) {
				hasError = true;
			}

			const event = mapAgentChunkToEvent(
				options.context.runId,
				options.context.agentId,
				chunk,
				currentResponseId,
			);
			if (event) {
				workSummaryAccumulator.observe(event);
				let shouldPublishEvent = true;

				if (event.type === 'confirmation-request') {
					const isPrimarySuspension =
						suspension !== undefined &&
						event.payload.requestId === suspension.requestId &&
						event.payload.toolCallId === suspension.toolCallId;
					if (!isPrimarySuspension || confirmationEventPublished || confirmationEvent) {
						shouldPublishEvent = false;
					}

					if (shouldPublishEvent && options.control.mode === 'manual') {
						confirmationEvent = event;
						shouldPublishEvent = false;
					}

					if (shouldPublishEvent) {
						confirmationEventPublished = true;
					}
				}

				if (shouldPublishEvent) {
					options.context.eventBus.publish(options.context.threadId, event);
				}
			}

			if (options.control.mode === 'auto' && options.control.drainCorrections) {
				const corrections = options.control.drainCorrections();
				publishCorrections(options.context, corrections);
				drainedCorrectionsForResume.push(...corrections);
			}
		}

		if (options.context.signal.aborted) {
			return {
				status: 'cancelled',
				agentRunId: activeAgentRunId,
				text,
				workSummary: workSummaryAccumulator.toSummary(),
			};
		}

		if (!suspension) {
			return {
				status: hasError ? 'errored' : 'completed',
				agentRunId: activeAgentRunId,
				text,
				workSummary: workSummaryAccumulator.toSummary(),
			};
		}

		if (options.control.mode === 'manual') {
			return {
				status: 'suspended',
				agentRunId: activeAgentRunId,
				text,
				suspension,
				workSummary: workSummaryAccumulator.toSummary(),
				...(confirmationEvent ? { confirmationEvent } : {}),
			};
		}

		const confirmationPromise =
			pendingConfirmation ?? options.control.waitForConfirmation(suspension.requestId);
		const resumeData = await waitForConfirmationOrCorrection(
			options.context.signal,
			confirmationPromise,
			options.control,
			options.context,
			drainedCorrectionsForResume,
		);
		const resumeOptions = options.control.buildResumeOptions?.({
			agentRunId: activeAgentRunId,
			suspension,
		}) ?? {
			runId: activeAgentRunId,
			toolCallId: suspension.toolCallId,
		};
		const resumed = await resumeAgentStream(options.agent, resumeData, {
			...resumeOptions,
		});
		const resumedSource = normalizeStreamSource(resumed);

		activeAgentRunId =
			(typeof resumedSource.runId === 'string' ? resumedSource.runId : '') || activeAgentRunId;
		activeStream = resumedSource.fullStream;
		text = resumedSource.text;
	}
}

function publishCorrections(context: ResumableStreamContext, corrections: string[]): void {
	for (const correction of corrections) {
		context.eventBus.publish(context.threadId, {
			type: 'text-delta',
			runId: context.runId,
			agentId: context.agentId,
			payload: { text: `\n[USER CORRECTION]: ${correction}\n` },
		});
	}
}

function buildCorrectionResumeData(corrections: string[]): Record<string, unknown> {
	return {
		__correctionOverride: true,
		message:
			'The user sent a correction while this run was active. ' +
			'The confirmation has been skipped. Apply the correction and continue.',
		corrections,
	};
}

function isErrorChunk(chunk: unknown): boolean {
	return (
		chunk !== null &&
		typeof chunk === 'object' &&
		(chunk as Record<string, unknown>).type === 'error'
	);
}

async function waitForConfirmation(
	signal: AbortSignal,
	confirmationPromise: Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
	if (signal.aborted) {
		throw new Error('Run cancelled while waiting for confirmation');
	}

	let abortHandler: (() => void) | undefined;

	try {
		return await Promise.race([
			confirmationPromise,
			new Promise<never>((_, reject) => {
				abortHandler = () => reject(new Error('Run cancelled while waiting for confirmation'));
				signal.addEventListener('abort', abortHandler, { once: true });
			}),
		]);
	} finally {
		if (abortHandler) {
			signal.removeEventListener('abort', abortHandler);
		}
	}
}

/**
 * Race the HITL confirmation promise against an incoming user correction.
 * When a correction arrives first, auto-confirm the suspended tool call with
 * override data so the builder can resume and incorporate the correction.
 */
async function waitForConfirmationOrCorrection(
	signal: AbortSignal,
	confirmationPromise: Promise<Record<string, unknown>>,
	control: AutoResumeControl,
	context: ResumableStreamContext,
	drainedCorrectionsForResume: string[],
): Promise<Record<string, unknown>> {
	if (drainedCorrectionsForResume.length > 0) {
		void confirmationPromise.catch(() => undefined);
		return buildCorrectionResumeData(drainedCorrectionsForResume);
	}

	if (!control.waitForCorrection) {
		return await waitForConfirmation(signal, confirmationPromise);
	}

	const correctionSentinel = Object.freeze({ __correctionOverride: true });
	const raced = Promise.race([
		confirmationPromise,
		control.waitForCorrection().then(() => correctionSentinel as Record<string, unknown>),
	]);

	const result = await waitForConfirmation(signal, raced);

	if (result === correctionSentinel) {
		const corrections = control.drainCorrections?.() ?? [];
		publishCorrections(context, corrections);
		return buildCorrectionResumeData(corrections);
	}

	return result;
}

function isSameSuspension(left: SuspensionInfo, right: SuspensionInfo): boolean {
	return left.requestId === right.requestId && left.toolCallId === right.toolCallId;
}
