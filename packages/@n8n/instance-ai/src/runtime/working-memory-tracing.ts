import { withCurrentTraceSpan } from '../tracing/langsmith-tracing';
import { isRecord } from '../utils/stream-helpers';

interface WorkingMemoryBinding {
	resourceId?: string;
	threadId?: string;
}

interface StreamHandleLike {
	runId?: string;
	text?: Promise<string>;
	steps?: Promise<unknown[]>;
	usage?: Promise<unknown>;
	totalUsage?: Promise<unknown>;
}

interface WorkingMemoryContextTraceOptions {
	phase: 'initial' | 'resume';
	agentId: string;
	threadId: string;
	agentRole?: string;
	input?: unknown;
	memory?: unknown;
	resumeData?: unknown;
	enabled?: boolean;
}

function countLines(value: string): number {
	return value === '' ? 0 : value.split(/\r?\n/u).length;
}

function getWorkingMemoryBinding(memory: unknown): WorkingMemoryBinding | undefined {
	if (!isRecord(memory)) {
		return undefined;
	}

	const resourceId = typeof memory.resource === 'string' ? memory.resource : undefined;
	const threadId = typeof memory.thread === 'string' ? memory.thread : undefined;

	if (!resourceId && !threadId) {
		return undefined;
	}

	return {
		...(resourceId ? { resourceId } : {}),
		...(threadId ? { threadId } : {}),
	};
}

function getWorkingMemoryRole(resourceId: string | undefined): string | undefined {
	if (!resourceId) {
		return undefined;
	}

	const separatorIndex = resourceId.indexOf(':');
	if (separatorIndex === -1 || separatorIndex === resourceId.length - 1) {
		return undefined;
	}

	return resourceId.slice(separatorIndex + 1);
}

function summarizeInput(value: unknown): Record<string, unknown> {
	if (typeof value === 'string') {
		return {
			input_type: 'text',
			input_chars: value.length,
			input_lines: countLines(value),
		};
	}

	if (Array.isArray(value)) {
		return {
			input_type: 'array',
			input_items: value.length,
		};
	}

	if (isRecord(value)) {
		return {
			input_type: 'object',
			input_keys: Object.keys(value).length,
		};
	}

	if (value === undefined) {
		return {};
	}

	return {
		input_type: typeof value,
	};
}

function summarizeResumeData(resumeData: unknown): Record<string, unknown> {
	if (!isRecord(resumeData)) {
		return {};
	}

	return {
		...(typeof resumeData.requestId === 'string' ? { request_id: resumeData.requestId } : {}),
		...(typeof resumeData.toolCallId === 'string' ? { tool_call_id: resumeData.toolCallId } : {}),
		...(typeof resumeData.runId === 'string' ? { mastra_run_id: resumeData.runId } : {}),
		resume_payload_keys: Object.keys(resumeData).length,
	};
}

function summarizeStreamHandle(stream: StreamHandleLike): Record<string, unknown> {
	return {
		status: 'stream_ready',
		...(typeof stream.runId === 'string' && stream.runId.length > 0
			? { mastra_run_id: stream.runId }
			: {}),
		has_text: stream.text !== undefined,
		has_steps: stream.steps !== undefined,
		has_usage: stream.usage !== undefined || stream.totalUsage !== undefined,
	};
}

export async function traceWorkingMemoryContext<T extends StreamHandleLike>(
	options: WorkingMemoryContextTraceOptions,
	fn: () => Promise<T>,
): Promise<T> {
	const binding = getWorkingMemoryBinding(options.memory);
	const shouldTrace = options.enabled ?? Boolean(binding);
	if (!shouldTrace) {
		return await fn();
	}

	return await withCurrentTraceSpan<T>(
		{
			name: 'prepare_context',
			tags: ['memory', 'prompt', 'internal'],
			metadata: {
				agent_id: options.agentId,
				...(options.agentRole ? { agent_role: options.agentRole } : {}),
				phase: options.phase,
				memory_enabled: true,
				prepare_context: 'working_memory',
				...(binding?.resourceId ? { resource_id: binding.resourceId } : {}),
				...(binding?.threadId ? { memory_thread_id: binding.threadId } : {}),
				...(getWorkingMemoryRole(binding?.resourceId)
					? { memory_role: getWorkingMemoryRole(binding?.resourceId) }
					: {}),
			},
			inputs: {
				thread_id: options.threadId,
				...summarizeInput(options.input),
				...summarizeResumeData(options.resumeData),
			},
			processOutputs: summarizeStreamHandle,
		},
		fn,
	);
}
