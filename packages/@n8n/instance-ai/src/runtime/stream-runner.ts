import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import type { OrchestratorRunStopSignal } from './orchestrator-run-control';
import {
	executeResumableStream,
	normalizeStreamSource,
	type ExecuteResumableStreamResult,
	type ResumableStreamSource,
} from './resumable-stream-executor';
import { resumeAgentStream } from '../utils/stream-helpers';

export interface StreamableAgent {
	stream: (input: unknown, options: Record<string, unknown>) => Promise<unknown>;
}

export interface StreamRunOptions {
	threadId: string;
	runId: string;
	agentId: string;
	signal: AbortSignal;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	onActivity?: () => void;
	stopSignal?: () => OrchestratorRunStopSignal | undefined;
	/** Return stream read failures with partial usage instead of throwing. */
	captureStreamErrors?: boolean;
}

export type StreamRunResult = ExecuteResumableStreamResult;

export async function streamAgentRun(
	agent: StreamableAgent,
	input: unknown,
	streamOptions: Record<string, unknown>,
	options: StreamRunOptions,
): Promise<StreamRunResult> {
	const result = await agent.stream(input, streamOptions);
	const stream = normalizeStreamSource(result);
	const agentRunId = typeof stream.runId === 'string' ? stream.runId : '';
	return await consumeStream(agent, stream, { ...options, agentRunId });
}

export async function resumeAgentRun(
	agent: unknown,
	resumeData: Record<string, unknown>,
	resumeOptions: Record<string, unknown>,
	options: StreamRunOptions & { agentRunId: string },
): Promise<StreamRunResult> {
	const resumed = await resumeAgentStream(agent, resumeData, resumeOptions);
	const stream = normalizeStreamSource(resumed);
	const agentRunId = (typeof stream.runId === 'string' && stream.runId) || options.agentRunId;
	return await consumeStream(agent, stream, { ...options, agentRunId });
}

async function consumeStream(
	agent: unknown,
	stream: ResumableStreamSource,
	options: StreamRunOptions & { agentRunId: string },
): Promise<StreamRunResult> {
	return await executeResumableStream({
		agent,
		stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.signal,
			logger: options.logger,
			onActivity: options.onActivity,
			stopSignal: options.stopSignal,
		},
		control: { mode: 'manual' },
		initialAgentRunId: options.agentRunId,
		captureStreamErrors: options.captureStreamErrors,
	});
}
