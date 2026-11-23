// ---------------------------------------------------------------------------
// The read loop of one in-process orchestrator turn.
//
// Like the Agents runtime, it reads the chunks of the agent stream directly,
// and it continues a suspended run with `agent.resume`. It has no thread event
// log, no run state and no storage. Each chunk that the chat shows becomes an
// Instance AI event, so the outcome and grading code reads the same shapes as
// in the e2e harness.
// ---------------------------------------------------------------------------

import type { Agent, ExecutionOptions, FinishReason } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import { mapAgentChunkToEvent } from '../../src/stream/map-chunk';
import { parseSuspension, type SuspensionInfo } from '../../src/utils/stream-helpers';

export interface StreamTurnOptions {
	agent: Pick<Agent, 'stream' | 'resume'>;
	input: string;
	/** Options of the first stream. A resume does not inherit them. */
	streamOptions: NonNullable<Parameters<Agent['stream']>[1]>;
	/** Options of each resumed stream, without the run and the tool call. */
	resumeOptions?: ExecutionOptions;
	/** Run id and agent id on the events. */
	runId: string;
	agentId: string;
	signal: AbortSignal;
	onEvent: (event: InstanceAiEvent) => void;
	/** Returns the resume data for a suspended tool call. Called when the suspension arrives. */
	answerSuspension: (suspension: SuspensionInfo) => Promise<Record<string, unknown>>;
}

export interface StreamTurnResult {
	status: 'completed' | 'errored' | 'cancelled';
	/** The reason on the last `finish` chunk. Absent when the stream ended without one. */
	finishReason?: FinishReason;
}

/** Runs one turn to its end. Each suspended tool call is answered and resumed. */
export async function streamTurn(options: StreamTurnOptions): Promise<StreamTurnResult> {
	const { agent, signal } = options;
	let { stream, runId: agentRunId } = await agent.stream(options.input, options.streamOptions);

	for (;;) {
		let suspension: SuspensionInfo | undefined;
		let resumeData: Promise<Record<string, unknown>> | undefined;
		let finishReason: FinishReason | undefined;
		let errored = false;

		const reader = stream.getReader();
		try {
			for (;;) {
				const { done, value: chunk } = await reader.read();
				if (done) break;
				if (signal.aborted) return { status: 'cancelled' };
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
					resumeData = options.answerSuspension(parsed);
					// The answer is awaited after the stream ends. An abort can come first.
					resumeData.catch(() => {});
				}

				const event = mapAgentChunkToEvent(options.runId, options.agentId, chunk);
				if (event && (event.type !== 'confirmation-request' || parsed)) options.onEvent(event);
			}
		} finally {
			reader.releaseLock();
		}

		if (signal.aborted) return { status: 'cancelled' };
		if (!suspension || !resumeData) {
			return { status: errored ? 'errored' : 'completed', finishReason };
		}

		const resumed = await agent.resume('stream', await resumeData, {
			...options.resumeOptions,
			runId: agentRunId,
			toolCallId: suspension.toolCallId,
		});
		stream = resumed.stream;
		agentRunId = resumed.runId || agentRunId;
	}
}
