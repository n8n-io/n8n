import type { InstanceAiEventBus } from '../event-bus';
import { mapMastraChunkToEvent } from '../stream/map-chunk';
import { asResumable, parseSuspension } from '../utils/stream-helpers';
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
	return await consumeStream(result.fullStream, { ...options, mastraRunId });
}

export async function resumeAgentRun(
	agent: unknown,
	resumeData: Record<string, unknown>,
	resumeOptions: Record<string, unknown>,
	options: StreamRunOptions & { mastraRunId: string },
): Promise<StreamRunResult> {
	const resumed = await asResumable(agent).resumeStream(resumeData, resumeOptions);
	const mastraRunId = (typeof resumed.runId === 'string' && resumed.runId) || options.mastraRunId;
	return await consumeStream(resumed.fullStream, { ...options, mastraRunId });
}

async function consumeStream(
	fullStream: AsyncIterable<unknown>,
	options: StreamRunOptions & { mastraRunId: string },
): Promise<StreamRunResult> {
	let suspension: SuspensionInfo | undefined;

	for await (const chunk of fullStream) {
		if (options.signal.aborted) {
			return { status: 'cancelled', mastraRunId: options.mastraRunId };
		}

		const parsedSuspension = parseSuspension(chunk);
		if (parsedSuspension) {
			suspension = parsedSuspension;
		}

		const event = mapMastraChunkToEvent(options.runId, options.agentId, chunk);
		if (event) {
			options.eventBus.publish(options.threadId, event);
		}
	}

	if (options.signal.aborted) {
		return { status: 'cancelled', mastraRunId: options.mastraRunId };
	}

	if (suspension) {
		return {
			status: 'suspended',
			mastraRunId: options.mastraRunId,
			suspension,
		};
	}

	return { status: 'completed', mastraRunId: options.mastraRunId };
}
