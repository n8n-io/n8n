import type { InstanceAiEvent } from '@n8n/api-types';
import type { StreamResult } from '@n8n/agents';

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
import { asResumable, isRecord } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

type StreamableAgentStreamResult = ResumableStreamSource | StreamResult;

export interface StreamableAgent {
	stream: (
		input: unknown,
		options: Record<string, unknown>,
	) => Promise<StreamableAgentStreamResult>;
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

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, Symbol.asyncIterator) === 'function'
	);
}

function isReadableStream(value: unknown): value is ReadableStream<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'getReader') === 'function'
	);
}

function isResumableStreamSource(value: unknown): value is ResumableStreamSource {
	return isRecord(value) && isAsyncIterable(value.fullStream);
}

function isNativeStreamResult(value: unknown): value is StreamResult {
	return isRecord(value) && isReadableStream(value.stream);
}

async function* readableStreamToAsyncIterable(stream: ReadableStream<unknown>) {
	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}

function normalizeStreamSource(result: StreamableAgentStreamResult): ResumableStreamSource {
	if (isResumableStreamSource(result)) {
		return result;
	}

	if (isNativeStreamResult(result)) {
		return {
			runId: result.runId,
			streamFormat: 'agent',
			fullStream: readableStreamToAsyncIterable(result.stream),
		};
	}

	throw new Error('Unsupported agent stream result');
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
		const stream = normalizeStreamSource(result);
		const agentRunId = typeof stream.runId === 'string' ? stream.runId : '';
		return await consumeStream(agent, stream, { ...options, agentRunId, llmStepTraceHooks });
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
		const stream = normalizeStreamSource(resumed);
		const agentRunId = (typeof stream.runId === 'string' && stream.runId) || options.agentRunId;
		return await consumeStream(agent, stream, { ...options, agentRunId, llmStepTraceHooks });
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
