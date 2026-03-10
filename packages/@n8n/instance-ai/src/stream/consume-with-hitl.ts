import type { Agent } from '@mastra/core/agent';

import { mapMastraChunkToEvent } from './map-chunk';
import type { InstanceAiEventBus } from '../event-bus/event-bus.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

interface ConsumeWithHitlOptions {
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

interface ConsumeWithHitlResult {
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
	const {
		agent,
		eventBus,
		runId,
		agentId,
		threadId,
		abortSignal,
		waitForConfirmation,
		drainCorrections,
	} = options;

	let subAgentStream: AsyncIterable<unknown> = options.stream.fullStream;
	let subMastraRunId = options.stream.runId ?? '';
	let textPromise: Promise<string> = options.stream.text;
	let streamCompleted = false;

	while (!streamCompleted) {
		let suspended: { toolCallId: string; requestId: string } | null = null;
		let confirmPromise: Promise<Record<string, unknown>> | null = null;

		for await (const chunk of subAgentStream) {
			if (abortSignal.aborted) break;

			if (isRecord(chunk) && chunk.type === 'tool-call-suspended') {
				const sp = isRecord(chunk.payload) ? chunk.payload : {};
				const suspPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : {};
				const tcId = typeof sp.toolCallId === 'string' ? sp.toolCallId : '';
				const reqId =
					typeof suspPayload.requestId === 'string' && suspPayload.requestId
						? suspPayload.requestId
						: tcId;
				if (reqId && tcId) {
					suspended = { toolCallId: tcId, requestId: reqId };
					if (waitForConfirmation) {
						confirmPromise = waitForConfirmation(reqId);
					}
				}
			}

			const event = mapMastraChunkToEvent(runId, agentId, chunk);
			if (event) {
				eventBus.publish(threadId, event);
			}

			// Surface queued user corrections in the event stream
			if (drainCorrections) {
				for (const correction of drainCorrections()) {
					eventBus.publish(threadId, {
						type: 'text-delta' as const,
						runId,
						agentId,
						payload: { text: `\n[USER CORRECTION]: ${correction}\n` },
					});
				}
			}
		}

		if (suspended) {
			if (!confirmPromise) {
				throw new Error('Sub-agent tool requires confirmation but no HITL handler is available');
			}

			// Race confirmation against abort signal so cancelled runs don't hang
			let abortHandler: (() => void) | undefined;
			const confirmResult = await Promise.race([
				confirmPromise.finally(() => {
					if (abortHandler) abortSignal.removeEventListener('abort', abortHandler);
				}),
				new Promise<never>((_, reject) => {
					if (abortSignal.aborted) {
						reject(new Error('Run cancelled while waiting for confirmation'));
						return;
					}
					abortHandler = () => reject(new Error('Run cancelled while waiting for confirmation'));
					abortSignal.addEventListener('abort', abortHandler, { once: true });
				}),
			]);
			const resumable = agent as unknown as {
				resumeStream: (
					data: Record<string, unknown>,
					options: Record<string, unknown>,
				) => Promise<{
					runId?: string;
					fullStream: AsyncIterable<unknown>;
					text: Promise<string>;
				}>;
			};
			const resumedStream = await resumable.resumeStream(confirmResult, {
				runId: subMastraRunId,
				toolCallId: suspended.toolCallId,
			});
			subMastraRunId =
				(typeof resumedStream.runId === 'string' ? resumedStream.runId : '') || subMastraRunId;
			subAgentStream = resumedStream.fullStream;
			textPromise = resumedStream.text;
		} else {
			streamCompleted = true;
		}
	}

	return { text: textPromise };
}
