import type { InstanceAiEventBus } from '../event-bus';
import { executeResumableStream } from './resumable-stream-executor';
import { asResumable } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

export interface StreamableAgent {
	stream: (
		input: unknown,
		options: Record<string, unknown>,
	) => Promise<{ runId?: string; fullStream: AsyncIterable<unknown> }>;
}

export interface StreamRunOptions {
	threadId: string;
	runId: string;
	agentId: string;
	signal: AbortSignal;
	eventBus: InstanceAiEventBus;
}

export interface StreamRunResult {
	status: 'completed' | 'cancelled' | 'suspended';
	mastraRunId: string;
	suspension?: SuspensionInfo;
}

export async function streamAgentRun(
	agent: StreamableAgent,
	input: unknown,
	streamOptions: Record<string, unknown>,
	options: StreamRunOptions,
): Promise<StreamRunResult> {
	const result = await agent.stream(input, streamOptions);
	const mastraRunId = typeof result.runId === 'string' ? result.runId : '';
	return await consumeStream(
		agent,
		{ runId: result.runId, fullStream: result.fullStream },
		{ ...options, mastraRunId },
	);
}

export async function resumeAgentRun(
	agent: unknown,
	resumeData: Record<string, unknown>,
	resumeOptions: Record<string, unknown>,
	options: StreamRunOptions & { mastraRunId: string },
): Promise<StreamRunResult> {
	const resumed = await asResumable(agent).resumeStream(resumeData, resumeOptions);
	const mastraRunId = (typeof resumed.runId === 'string' && resumed.runId) || options.mastraRunId;
	return await consumeStream(
		agent,
		{ runId: resumed.runId, fullStream: resumed.fullStream, text: resumed.text },
		{ ...options, mastraRunId },
	);
}

async function consumeStream(
	agent: unknown,
	stream: { runId?: string; fullStream: AsyncIterable<unknown>; text?: Promise<string> },
	options: StreamRunOptions & { mastraRunId: string },
): Promise<StreamRunResult> {
	const result = await executeResumableStream({
		agent,
		stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.signal,
		},
		control: { mode: 'manual' },
		initialMastraRunId: options.mastraRunId,
	});

	if (result.status === 'suspended' && result.suspension) {
		return {
			status: 'suspended',
			mastraRunId: result.mastraRunId,
			suspension: result.suspension,
		};
	}

	return {
		status: result.status === 'cancelled' ? 'cancelled' : 'completed',
		mastraRunId: result.mastraRunId,
	};
}
