// ---------------------------------------------------------------------------
// The read loop of one in-process orchestrator turn.
//
// Like the Agents runtime, it reads the chunks of the agent stream directly,
// and it continues a suspended run with `agent.resume`. It has no thread event
// log, no run state and no storage. Each chunk that the chat shows becomes an
// Instance AI event, so the outcome and grading code reads the same shapes as
// in the e2e harness.
// ---------------------------------------------------------------------------

import type { Agent, ExecutionOptions, FinishReason, RunOptions } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import { mapAgentChunkToEvent } from '../../src/stream/map-chunk';
import { parseSuspension, type SuspensionInfo } from '../../src/utils/stream-helpers';

export interface StreamTurnOptions {
	agent: Pick<Agent, 'stream' | 'resume'>;
	input: string;
	/**
	 * Options of the first stream and of each resumed stream. A suspended run
	 * keeps only its iteration limit, so a resume needs the other options again.
	 */
	executionOptions?: ExecutionOptions;
	/** The thread of the run. A suspended run keeps it. */
	persistence?: RunOptions['persistence'];
	/** Run id and agent id on the events. */
	runId: string;
	agentId: string;
	/** Aborts the first stream and each resumed stream. */
	signal: AbortSignal;
	onEvent: (event: InstanceAiEvent) => void;
	/**
	 * Returns the resume data for a suspended tool call, or `undefined` to end
	 * the turn there. Called when the suspension arrives.
	 */
	answerSuspension: (suspension: SuspensionInfo) => Promise<Record<string, unknown> | undefined>;
}

export interface StreamTurnResult {
	/** `suspended`: the turn ended at a tool call that got no answer. */
	status: 'completed' | 'errored' | 'cancelled' | 'suspended';
	/** The reason on the last `finish` chunk. Absent when the stream ended without one. */
	finishReason?: FinishReason;
}

/** Runs one turn to its end. Each suspended tool call that gets an answer is resumed. */
export async function streamTurn(options: StreamTurnOptions): Promise<StreamTurnResult> {
	const { agent, signal } = options;
	const executionOptions = { ...options.executionOptions, abortSignal: signal };
	let { stream, runId: agentRunId } = await agent.stream(options.input, {
		...executionOptions,
		...(options.persistence ? { persistence: options.persistence } : {}),
	});

	for (;;) {
		let suspension: SuspensionInfo | undefined;
		let answer: Promise<Record<string, unknown> | undefined> | undefined;
		let finishReason: FinishReason | undefined;
		let errored = false;

		const reader = stream.getReader();
		try {
			for (;;) {
				const { done, value: chunk } = await reader.read();
				if (done) break;
				if (signal.aborted) {
					// The agent disposes the runtime of a stream when the stream ends or is cancelled.
					await reader.cancel().catch(() => {});
					return { status: 'cancelled' };
				}
				// The agent waits at each input boundary until the reader acknowledges it.
				if (chunk.type === 'input-boundary') {
					chunk.acknowledge();
					continue;
				}
				if (chunk.type === 'finish') finishReason = chunk.finishReason;
				if (chunk.type === 'error') errored = true;

				// One resume answers one tool call, so a pass keeps its first suspension.
				// The agent sends the other open suspensions again after the resume.
				const parsed = suspension ? undefined : parseSuspension(chunk);
				if (parsed) {
					suspension = parsed;
					answer = options.answerSuspension(parsed);
					// The answer is awaited after the stream ends. An abort can come first.
					answer.catch(() => {});
				}

				const event = mapAgentChunkToEvent(options.runId, options.agentId, chunk);
				if (event && (event.type !== 'confirmation-request' || parsed)) options.onEvent(event);
			}
		} finally {
			reader.releaseLock();
		}

		if (signal.aborted) return { status: 'cancelled' };
		if (!suspension) return { status: errored ? 'errored' : 'completed', finishReason };
		const resumeData = await answer;
		if (!resumeData) return { status: 'suspended', finishReason };

		const resumed = await agent.resume('stream', resumeData, {
			...executionOptions,
			runId: agentRunId,
			toolCallId: suspension.toolCallId,
		});
		stream = resumed.stream;
		agentRunId = resumed.runId || agentRunId;
	}
}
