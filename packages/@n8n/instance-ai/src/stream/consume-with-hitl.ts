import type { Agent } from '@mastra/core/agent';

import type { InstanceAiEventBus } from '../event-bus/event-bus.interface';
import { executeResumableStream } from '../runtime/resumable-stream-executor';

export interface ConsumeWithHitlOptions {
	agent: Agent;
	stream: { runId?: string; fullStream: AsyncIterable<unknown>; text: Promise<string> };
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	threadId: string;
	abortSignal: AbortSignal;
	waitForConfirmation?: (requestId: string) => Promise<Record<string, unknown>>;
	/** Drain queued user corrections (mid-flight steering for background tasks). */
	drainCorrections?: () => string[];
}

export interface ConsumeWithHitlResult {
	/** Promise that resolves to the agent's full text output (including post-resume text). */
	text: Promise<string>;
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

	const result = await executeResumableStream({
		agent: options.agent,
		stream: options.stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.abortSignal,
		},
		control: {
			mode: 'auto',
			waitForConfirmation: options.waitForConfirmation,
			drainCorrections: options.drainCorrections,
		},
	});

	return { text: result.text ?? options.stream.text };
}
