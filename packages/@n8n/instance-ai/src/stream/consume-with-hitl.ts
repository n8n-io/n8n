import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus/event-bus.interface';
import type { Logger } from '../logger';
import {
	executeResumableStream,
	normalizeStreamSource,
	type TraceStatus,
} from '../runtime/resumable-stream-executor';
import type { WorkSummary } from '../stream/work-summary-accumulator';
import type { SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface ConsumeWithHitlOptions {
	agent: unknown;
	stream: unknown;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	threadId: string;
	abortSignal: AbortSignal;
	waitForConfirmation?: (requestId: string) => Promise<Record<string, unknown>>;
	/** Drain queued user corrections (mid-flight steering for background tasks). */
	drainCorrections?: () => string[];
	/** Returns a promise that resolves when a new user correction is queued.
	 *  Used to unblock HITL suspensions when a correction arrives mid-confirmation. */
	waitForCorrection?: () => Promise<void>;
	/** Max iterations for the agent; passed to native stream resume so resumed streams keep the same limit. */
	maxIterations?: number;
	/** Additional options to preserve when resuming a suspended stream. */
	resumeOptions?: Record<string, unknown>;
	/** Native agent persistence owner for suspended sub-agent state. */
	persistence?: { threadId: string; resourceId: string };
}

export interface ConsumeWithHitlResult {
	/** Final native stream consumption status. */
	status: TraceStatus;
	/** Native sub-agent run ID. */
	agentRunId: string;
	/** Promise that resolves to the agent's full text output (including post-resume text). */
	text: Promise<string>;
	/** Accumulated tool call outcomes observed during stream consumption. */
	workSummary: WorkSummary;
}

export async function requireCompletedHitlText(
	result: ConsumeWithHitlResult,
	agentLabel: string,
): Promise<string> {
	if (result.status === 'completed') {
		return await result.text;
	}

	const reason =
		result.status === 'cancelled'
			? 'was cancelled'
			: result.status === 'errored'
				? 'failed while streaming'
				: `ended with unexpected status "${result.status}"`;
	throw new Error(`${agentLabel} ${reason}`);
}

/**
 * Consume a sub-agent stream with HITL suspend/resume support.
 * Detects `tool-call-suspended` chunks, waits for user confirmation,
 * and resumes the stream. Used by delegate, builder, and other agent tools.
 *
 * Returns `{ text }` — a promise for the agent's full text output.
 * When HITL occurred, this returns the resumed stream's text (not the original).
 */
export async function consumeStreamWithHitl(
	options: ConsumeWithHitlOptions,
): Promise<ConsumeWithHitlResult> {
	if (!options.waitForConfirmation) {
		throw new Error('Sub-agent tool requires confirmation but no HITL handler is available');
	}

	const stream = normalizeStreamSource(options.stream);
	const result = await executeResumableStream({
		agent: options.agent,
		stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.abortSignal,
			logger: options.logger,
		},
		control: {
			mode: 'auto',
			waitForConfirmation: options.waitForConfirmation,
			drainCorrections: options.drainCorrections,
			waitForCorrection: options.waitForCorrection,
			buildResumeOptions: ({ agentRunId, suspension }) => ({
				runId: agentRunId,
				toolCallId: suspension.toolCallId,
				...(options.maxIterations ? { maxIterations: options.maxIterations } : {}),
				...(options.resumeOptions ?? {}),
				...(options.persistence ? { persistence: options.persistence } : {}),
			}),
		},
	});

	return {
		status: result.status,
		agentRunId: result.agentRunId,
		text: result.text ?? stream.text ?? Promise.resolve(''),
		workSummary: result.workSummary,
	};
}

export interface ConsumeStreamCascadingOptions {
	agent: unknown;
	stream: unknown;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	threadId: string;
	abortSignal: AbortSignal;
}

export type ConsumeStreamCascadingResult =
	| {
			status: 'completed' | 'cancelled' | 'errored';
			agentRunId: string;
			text: Promise<string>;
			workSummary: WorkSummary;
	  }
	| {
			status: 'suspended';
			agentRunId: string;
			suspension: SuspensionInfo;
			confirmationEvent?: ConfirmationRequestEvent;
			text?: Promise<string>;
			workSummary: WorkSummary;
	  };

/**
 * Consume a sub-agent stream and return cleanly when it either finishes or
 * hits a HITL suspension. Unlike `consumeStreamWithHitl` (which transparently
 * bridges sub-agent suspensions to a parent `waitForConfirmation` Promise),
 * this returns the suspension info to the caller so the caller can decide
 * how to handle it — e.g. cascade the suspension up to its own SDK suspend
 * via `ctx.suspend(payload)`, so the parent's agent run is also checkpointed
 * and survives a process restart.
 *
 * Uses `executeResumableStream`'s manual mode, which suppresses the
 * sub-agent's `confirmation-request` event publish (returning it on the
 * result instead) — the caller emits the card at whatever runId is
 * meaningful at its level.
 */
export async function consumeStreamCascading(
	options: ConsumeStreamCascadingOptions,
): Promise<ConsumeStreamCascadingResult> {
	const stream = normalizeStreamSource(options.stream);
	const result = await executeResumableStream({
		agent: options.agent,
		stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.abortSignal,
			logger: options.logger,
		},
		control: { mode: 'manual' },
	});

	if (result.status === 'suspended' && result.suspension) {
		return {
			status: 'suspended',
			agentRunId: result.agentRunId,
			suspension: result.suspension,
			...(result.confirmationEvent ? { confirmationEvent: result.confirmationEvent } : {}),
			...(result.text ? { text: result.text } : {}),
			workSummary: result.workSummary,
		};
	}

	return {
		status: result.status === 'suspended' ? 'errored' : result.status,
		agentRunId: result.agentRunId,
		text: result.text ?? stream.text ?? Promise.resolve(''),
		workSummary: result.workSummary,
	};
}
