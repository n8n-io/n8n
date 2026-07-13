import type { RedactionOptions } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import type {
	OrchestratorRunHandoffReason,
	OrchestratorRunStopSignal,
} from './orchestrator-run-control';
import {
	executeResumableStream,
	normalizeStreamSource,
	type ResumableStreamSource,
	type TraceStatus,
} from './resumable-stream-executor';
import type { RunTokenUsage } from '../stream/usage-accumulator';
import type { WorkSummary } from '../stream/work-summary-accumulator';
import { resumeAgentStream } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

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
	/** Output-redaction policy: omit for the safe default, or `false` to disable. */
	outputRedaction?: RedactionOptions | false;
}

export interface StreamRunResult {
	status: TraceStatus;
	agentRunId: string;
	text?: Promise<string>;
	error?: unknown;
	workSummary: WorkSummary;
	usage?: RunTokenUsage;
	stopReason?: OrchestratorRunHandoffReason;
	suspension?: SuspensionInfo;
	confirmationEvent?: Extract<InstanceAiEvent, { type: 'confirmation-request' }>;
}

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
	const result = await executeResumableStream({
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
			outputRedaction: options.outputRedaction,
		},
		control: { mode: 'manual' },
		initialAgentRunId: options.agentRunId,
	});

	if (result.status === 'suspended' && result.suspension) {
		return {
			status: 'suspended',
			agentRunId: result.agentRunId,
			text: result.text,
			workSummary: result.workSummary,
			usage: result.usage,
			suspension: result.suspension,
			...(result.confirmationEvent ? { confirmationEvent: result.confirmationEvent } : {}),
		};
	}

	return {
		status:
			result.status === 'cancelled'
				? 'cancelled'
				: result.status === 'errored'
					? 'errored'
					: 'completed',
		agentRunId: result.agentRunId,
		text: result.text,
		...(result.error !== undefined ? { error: result.error } : {}),
		workSummary: result.workSummary,
		usage: result.usage,
		...(result.stopReason ? { stopReason: result.stopReason } : {}),
	};
}
