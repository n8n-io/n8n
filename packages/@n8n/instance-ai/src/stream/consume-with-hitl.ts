import type { InstanceAiEventBus } from '../event-bus/event-bus.interface';
import type { Logger } from '../logger';
import {
	type LlmStepTraceHooks,
	executeResumableStream,
	normalizeStreamSource,
} from '../runtime/resumable-stream-executor';
import type { WorkSummary } from '../stream/work-summary-accumulator';

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
	llmStepTraceHooks?: LlmStepTraceHooks;
	/** Max iterations for the agent; passed to native stream resume so resumed streams keep the same limit. */
	maxIterations?: number;
	/** Additional options to preserve when resuming a suspended stream. */
	resumeOptions?: Record<string, unknown>;
}

export interface ConsumeWithHitlResult {
	/** Promise that resolves to the agent's full text output (including post-resume text). */
	text: Promise<string>;
	/** Accumulated tool call outcomes observed during stream consumption. */
	workSummary: WorkSummary;
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
			...(options.maxIterations
				? {
						buildResumeOptions: ({ agentRunId, suspension }) => ({
							runId: agentRunId,
							toolCallId: suspension.toolCallId,
							maxIterations: options.maxIterations,
							...(options.resumeOptions ?? {}),
						}),
					}
				: {}),
		},
		llmStepTraceHooks: options.llmStepTraceHooks,
	});

	return {
		text: result.text ?? stream.text ?? Promise.resolve(''),
		workSummary: result.workSummary,
	};
}
