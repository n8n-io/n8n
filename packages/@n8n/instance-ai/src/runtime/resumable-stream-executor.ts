import type { RedactionOptions, StreamResult } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import type {
	OrchestratorRunHandoffReason,
	OrchestratorRunStopSignal,
} from './orchestrator-run-control';
import { mapAgentChunkToEvent } from '../stream/map-chunk';
import { OutputRedactor } from '../stream/output-redaction';
import { UsageAccumulator, type RunTokenUsage } from '../stream/usage-accumulator';
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
	/** Stop consuming after the current chunk has been mapped and published. */
	stopSignal?: () => OrchestratorRunStopSignal | undefined;
	/** Output-redaction policy: omit for the safe default, or `false` to disable. */
	outputRedaction?: RedactionOptions | false;
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
	error?: unknown;
	suspension?: SuspensionInfo;
	confirmationEvent?: ConfirmationRequestEvent;
	/** Accumulated tool call outcomes observed during stream consumption. */
	workSummary: WorkSummary;
	/** Accumulated token usage and cost, when the stream emitted usage. */
	usage?: RunTokenUsage;
	/** Reason this stream stopped early after publishing the current chunk. */
	stopReason?: OrchestratorRunHandoffReason;
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

function buildCancelledResult(
	agentRunId: string,
	text: Promise<string> | undefined,
	workSummaryAccumulator: WorkSummaryAccumulator,
	usageAccumulator: UsageAccumulator,
): ExecuteResumableStreamResult {
	return {
		status: 'cancelled',
		agentRunId,
		text,
		workSummary: workSummaryAccumulator.toSummary(),
		usage: usageAccumulator.hasUsage() ? usageAccumulator.toUsage() : undefined,
	};
}

/**
 * Record a parsed suspension. The first suspension is kept (and, in auto mode,
 * its confirmation awaited); any further distinct suspension before resume is
 * logged and deferred.
 */
function recordSuspension(
	parsedSuspension: SuspensionInfo,
	current: SuspensionInfo | undefined,
	control: ResumableStreamControl,
	context: ResumableStreamContext,
): { suspension: SuspensionInfo; pendingConfirmation?: Promise<Record<string, unknown>> } {
	if (current) {
		if (!isSameSuspension(parsedSuspension, current)) {
			context.logger.warn('Additional HITL suspension encountered before resume; deferring', {
				threadId: context.threadId,
				runId: context.runId,
				activeRequestId: current.requestId,
				deferredRequestId: parsedSuspension.requestId,
				activeToolCallId: current.toolCallId,
				deferredToolCallId: parsedSuspension.toolCallId,
			});
		}
		return { suspension: current };
	}

	if (control.mode === 'auto') {
		control.onSuspension?.(parsedSuspension);
		return {
			suspension: parsedSuspension,
			pendingConfirmation: control.waitForConfirmation(parsedSuspension.requestId),
		};
	}
	return { suspension: parsedSuspension };
}

/**
 * Publish redacted events, holding back the primary confirmation-request event in
 * manual mode and de-duplicating it. Returns the updated confirmation-tracking state.
 */
function publishRedactedEvents(
	events: InstanceAiEvent[],
	args: {
		suspension: SuspensionInfo | undefined;
		confirmationEvent: ConfirmationRequestEvent | undefined;
		confirmationEventPublished: boolean;
		control: ResumableStreamControl;
		context: ResumableStreamContext;
		workSummaryAccumulator: WorkSummaryAccumulator;
	},
): { confirmationEvent?: ConfirmationRequestEvent; confirmationEventPublished: boolean } {
	const { suspension, control, context, workSummaryAccumulator } = args;
	let confirmationEvent = args.confirmationEvent;
	let confirmationEventPublished = args.confirmationEventPublished;

	for (const event of events) {
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

			if (shouldPublishEvent && control.mode === 'manual') {
				confirmationEvent = event;
				shouldPublishEvent = false;
			}

			if (shouldPublishEvent) {
				confirmationEventPublished = true;
			}
		}

		if (shouldPublishEvent) {
			context.eventBus.publish(context.threadId, event);
		}
	}

	return { confirmationEvent, confirmationEventPublished };
}

interface StreamPassResult {
	cancelled: boolean;
	stopReason?: OrchestratorRunHandoffReason;
	suspension?: SuspensionInfo;
	hasError: boolean;
	error?: unknown;
	pendingConfirmation?: Promise<Record<string, unknown>>;
	confirmationEvent?: ConfirmationRequestEvent;
	drainedCorrectionsForResume: string[];
	currentResponseId: string | undefined;
	nativeStepIndex: number;
}

/**
 * Consume one stream until it ends (or is cancelled), publishing redacted events,
 * accumulating usage/work, and capturing the first suspension. Returns the pass
 * outcome plus the updated response-id / step counters for the next pass.
 */
async function consumeStreamPass(args: {
	activeStream: AsyncIterable<unknown>;
	activeAgentRunId: string;
	options: ExecuteResumableStreamOptions;
	workSummaryAccumulator: WorkSummaryAccumulator;
	usageAccumulator: UsageAccumulator;
	outputRedactor: OutputRedactor;
	currentResponseId: string | undefined;
	nativeStepIndex: number;
}): Promise<StreamPassResult> {
	const {
		activeStream,
		activeAgentRunId,
		options,
		workSummaryAccumulator,
		usageAccumulator,
		outputRedactor,
	} = args;
	let currentResponseId = args.currentResponseId;
	let nativeStepIndex = args.nativeStepIndex;
	let suspension: SuspensionInfo | undefined;
	let hasError = false;
	let error: unknown;
	let pendingConfirmation: Promise<Record<string, unknown>> | undefined;
	let confirmationEvent: ConfirmationRequestEvent | undefined;
	let confirmationEventPublished = false;
	const drainedCorrectionsForResume: string[] = [];

	for await (const chunk of activeStream) {
		if (options.context.signal.aborted) {
			// A stop aborts the agent stream too: it stops generating and emits a
			// terminal finish chunk carrying the run's usage. Drain the rest of the
			// stream (without publishing further events) so that usage is observed
			// and the cancelled run still gets billed for the tokens it consumed.
			usageAccumulator.observe(chunk);
			try {
				for await (const remaining of activeStream) {
					usageAccumulator.observe(remaining);
				}
			} catch (drainError) {
				options.context.logger.debug('Instance AI abort drain ended early', {
					threadId: options.context.threadId,
					runId: options.context.runId,
					error: drainError instanceof Error ? drainError.message : String(drainError),
				});
			}
			return {
				cancelled: true,
				hasError,
				drainedCorrectionsForResume,
				currentResponseId,
				nativeStepIndex,
			};
		}

		options.context.onActivity?.();
		usageAccumulator.observe(chunk);

		if (isRecord(chunk) && chunk.type === 'start-step') {
			nativeStepIndex += 1;
			const responseRunId = activeAgentRunId || options.context.runId;
			currentResponseId = `${responseRunId}:step:${nativeStepIndex}`;
		}

		const parsedSuspension = parseSuspension(chunk);
		if (parsedSuspension) {
			const recorded = recordSuspension(
				parsedSuspension,
				suspension,
				options.control,
				options.context,
			);
			suspension = recorded.suspension;
			if (recorded.pendingConfirmation) pendingConfirmation = recorded.pendingConfirmation;
		}

		if (isErrorChunk(chunk)) {
			hasError = true;
			error = chunk.error;
		}

		const mappedEvent = mapAgentChunkToEvent(
			options.context.runId,
			options.context.agentId,
			chunk,
			currentResponseId,
		);

		// Scan/redact secrets & PII before events reach the user. Buffered
		// delta text is released here at structural boundaries, so this may
		// expand into several events (or none, while text is held back).
		const events = mappedEvent ? outputRedactor.processEvent(mappedEvent) : [];

		const published = publishRedactedEvents(events, {
			suspension,
			confirmationEvent,
			confirmationEventPublished,
			control: options.control,
			context: options.context,
			workSummaryAccumulator,
		});
		confirmationEvent = published.confirmationEvent;
		confirmationEventPublished = published.confirmationEventPublished;

		if (options.control.mode === 'auto' && options.control.drainCorrections) {
			const corrections = options.control.drainCorrections();
			publishCorrections(options.context, corrections);
			drainedCorrectionsForResume.push(...corrections);
		}

		const stopSignal = options.context.stopSignal?.();
		if (stopSignal) {
			return {
				cancelled: false,
				stopReason: stopSignal.reason,
				suspension,
				hasError,
				error,
				pendingConfirmation,
				confirmationEvent,
				drainedCorrectionsForResume,
				currentResponseId,
				nativeStepIndex,
			};
		}
	}

	return {
		cancelled: false,
		suspension,
		hasError,
		error,
		pendingConfirmation,
		confirmationEvent,
		drainedCorrectionsForResume,
		currentResponseId,
		nativeStepIndex,
	};
}

export async function executeResumableStream(
	options: ExecuteResumableStreamOptions,
): Promise<ExecuteResumableStreamResult> {
	let activeStream = options.stream.fullStream;
	let activeAgentRunId = options.stream.runId ?? options.initialAgentRunId ?? '';
	let text = options.stream.text;
	const workSummaryAccumulator = new WorkSummaryAccumulator();
	const usageAccumulator = new UsageAccumulator();
	const outputRedactor = new OutputRedactor({
		logger: options.context.logger,
		threadId: options.context.threadId,
		runId: options.context.runId,
		agentId: options.context.agentId,
		options: options.context.outputRedaction,
	});

	let currentResponseId: string | undefined;
	let nativeStepIndex = 0;

	while (true) {
		const pass = await consumeStreamPass({
			activeStream,
			activeAgentRunId,
			options,
			workSummaryAccumulator,
			usageAccumulator,
			outputRedactor,
			currentResponseId,
			nativeStepIndex,
		});
		currentResponseId = pass.currentResponseId;
		nativeStepIndex = pass.nativeStepIndex;

		if (pass.cancelled) {
			return buildCancelledResult(activeAgentRunId, text, workSummaryAccumulator, usageAccumulator);
		}

		const { suspension, hasError, error, pendingConfirmation, confirmationEvent } = pass;
		const { drainedCorrectionsForResume } = pass;

		for (const flushed of outputRedactor.flush()) {
			workSummaryAccumulator.observe(flushed);
			options.context.eventBus.publish(options.context.threadId, flushed);
		}

		if (options.context.signal.aborted) {
			return buildCancelledResult(activeAgentRunId, text, workSummaryAccumulator, usageAccumulator);
		}

		if (pass.stopReason) {
			return {
				status: hasError ? 'errored' : 'completed',
				agentRunId: activeAgentRunId,
				text,
				...(error !== undefined ? { error } : {}),
				workSummary: workSummaryAccumulator.toSummary(),
				usage: usageAccumulator.hasUsage() ? usageAccumulator.toUsage() : undefined,
				stopReason: pass.stopReason,
			};
		}

		if (!suspension) {
			return {
				status: hasError ? 'errored' : 'completed',
				agentRunId: activeAgentRunId,
				text,
				...(error !== undefined ? { error } : {}),
				workSummary: workSummaryAccumulator.toSummary(),
				usage: usageAccumulator.hasUsage() ? usageAccumulator.toUsage() : undefined,
			};
		}

		if (options.control.mode === 'manual') {
			return {
				status: 'suspended',
				agentRunId: activeAgentRunId,
				text,
				suspension,
				workSummary: workSummaryAccumulator.toSummary(),
				usage: usageAccumulator.hasUsage() ? usageAccumulator.toUsage() : undefined,
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

function isErrorChunk(chunk: unknown): chunk is { type: 'error'; error?: unknown } {
	return isRecord(chunk) && chunk.type === 'error';
}

async function waitForConfirmation(
	signal: AbortSignal,
	confirmationPromise: Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
	if (signal.aborted) {
		throw new Error(
			'The assistant was interrupted while waiting for your response. Send a new message to continue.',
		);
	}

	let abortHandler: (() => void) | undefined;

	try {
		return await Promise.race([
			confirmationPromise,
			new Promise<never>((_, reject) => {
				abortHandler = () =>
					reject(
						new Error(
							'The assistant was interrupted while waiting for your response. Send a new message to continue.',
						),
					);
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
