import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import {
	createLlmStepTraceHooks,
	executeResumableStream,
	type LlmStepTraceHooks,
	type ResumableStreamSource,
	type TraceStatus,
} from './resumable-stream-executor';
import { getTraceParentRun, withTraceParentContext } from '../tracing/langsmith-tracing';
import { asResumable } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

export interface StreamableAgent {
	stream: (input: unknown, options: Record<string, unknown>) => Promise<ResumableStreamSource>;
}

export interface StreamRunOptions {
	threadId: string;
	runId: string;
	agentId: string;
	signal: AbortSignal;
	eventBus: InstanceAiEventBus;
	logger: Logger;
}

export interface StreamRunResult {
	status: TraceStatus;
	agentRunId: string;
	text?: Promise<string>;
	suspension?: SuspensionInfo;
	confirmationEvent?: Extract<InstanceAiEvent, { type: 'confirmation-request' }>;
}

export async function streamAgentRun(
	agent: StreamableAgent,
	input: unknown,
	streamOptions: Record<string, unknown>,
	options: StreamRunOptions,
): Promise<StreamRunResult> {
	const traceParent = getTraceParentRun();
	return await withTraceParentContext(traceParent, async () => {
		const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
		const result = await agent.stream(input, {
			...streamOptions,
			...(llmStepTraceHooks?.executionOptions ?? {}),
		});
		const agentRunId = typeof result.runId === 'string' ? result.runId : '';
		return await consumeStream(agent, result, { ...options, agentRunId, llmStepTraceHooks });
	});
}

export async function resumeAgentRun(
	agent: unknown,
	resumeData: Record<string, unknown>,
	resumeOptions: Record<string, unknown>,
	options: StreamRunOptions & { agentRunId: string },
): Promise<StreamRunResult> {
	const resumeTraceParent = getTraceParentRun();
	return await withTraceParentContext(resumeTraceParent, async () => {
		const llmStepTraceHooks = createLlmStepTraceHooks(resumeTraceParent);
		const resumed = await asResumable(agent).resumeStream(resumeData, {
			...resumeOptions,
			...(llmStepTraceHooks?.executionOptions ?? {}),
		});
		const agentRunId = (typeof resumed.runId === 'string' && resumed.runId) || options.agentRunId;
		return await consumeStream(agent, resumed, { ...options, agentRunId, llmStepTraceHooks });
	});
}

async function consumeStream(
	agent: unknown,
	stream: ResumableStreamSource,
	options: StreamRunOptions & { agentRunId: string; llmStepTraceHooks?: LlmStepTraceHooks },
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
		},
		control: { mode: 'manual' },
		initialAgentRunId: options.agentRunId,
		llmStepTraceHooks: options.llmStepTraceHooks,
	});

	if (result.status === 'suspended' && result.suspension) {
		return {
			status: 'suspended',
			agentRunId: result.agentRunId,
			text: result.text,
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
	};
}
