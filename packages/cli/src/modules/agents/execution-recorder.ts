import type { StreamChunk } from '@n8n/agents';
import type { ToolRegistry } from './tool-registry';

export interface RecordedUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export interface RecordedToolCall {
	name: string;
	input: unknown;
	output: unknown;
}

export type TimelineEvent =
	| { type: 'text'; content: string; timestamp: number }
	| {
			type: 'tool-call';
			kind: 'tool' | 'workflow';
			name: string;
			toolCallId: string;
			input: unknown;
			output: unknown;
			startTime: number;
			endTime: number;
			success: boolean;
			workflowId?: string;
			workflowName?: string;
			workflowExecutionId?: string;
			triggerType?: string;
	  }
	| { type: 'working-memory'; content: string; timestamp: number }
	| { type: 'suspension'; toolName: string; toolCallId: string; timestamp: number };

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

/**
 * Collects execution data from agent stream chunks.
 * Used to build an execution record after a message cycle completes.
 */
export interface MessageRecord {
	assistantResponse: string;
	model: string | null;
	finishReason: string;
	usage: RecordedUsage | null;
	totalCost: number | null;
	toolCalls: RecordedToolCall[];
	timeline: TimelineEvent[];
	startTime: number;
	duration: number;
	error: string | null;
	workingMemory: string | null;
}

export class ExecutionRecorder {
	private readonly registry: ToolRegistry;

	constructor(registry?: ToolRegistry) {
		this.registry = registry ?? new Map();
	}

	private textParts: string[] = [];

	/** Text buffer for the current segment (flushed to timeline on boundaries). */
	private textBuffer: string[] = [];

	private model: string | null = null;

	private finishReason = 'unknown';

	private usage: RecordedUsage | null = null;

	private totalCost: number | null = null;

	private toolCalls: RecordedToolCall[] = [];

	private timeline: TimelineEvent[] = [];

	private _suspended = false;

	private error: string | null = null;

	private workingMemory: string | null = null;

	private readonly startTime = Date.now();

	/** Feed a stream chunk into the recorder. */
	record(chunk: StreamChunk): void {
		switch (chunk.type) {
			case 'text-delta':
				this.textParts.push(chunk.delta);
				this.textBuffer.push(chunk.delta);
				break;
			case 'tool-call':
				this.recordToolCall(chunk.toolCallId, chunk.toolName, chunk.input);
				break;
			case 'tool-result':
				this.recordToolResult(
					chunk.toolCallId,
					chunk.toolName,
					chunk.output,
					chunk.isError === true,
				);
				break;
			case 'finish':
				this.flushTextBuffer();
				this.finishReason = chunk.finishReason;
				if (chunk.usage) {
					this.usage = {
						promptTokens: chunk.usage.promptTokens,
						completionTokens: chunk.usage.completionTokens,
						totalTokens: chunk.usage.totalTokens,
					};
				}
				this.model = chunk.model ?? null;
				this.totalCost = chunk.totalCost ?? chunk.usage?.cost ?? null;
				break;
			case 'tool-call-suspended':
				this.flushTextBuffer();
				this._suspended = true;
				this.timeline.push({
					type: 'suspension',
					toolName: chunk.toolName ?? '',
					toolCallId: chunk.toolCallId ?? '',
					timestamp: Date.now(),
				});
				break;
			case 'working-memory-update':
				this.flushTextBuffer();
				this.workingMemory = chunk.content;
				this.timeline.push({
					type: 'working-memory',
					content: chunk.content,
					timestamp: Date.now(),
				});
				break;
			case 'error': {
				const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
				this.error = errMsg;
				break;
			}
		}
	}

	/** Whether the stream ended with a tool-call suspension (incomplete cycle). */
	get suspended(): boolean {
		return this._suspended;
	}

	/** Build the final message record after the stream has ended. */
	getMessageRecord(): MessageRecord {
		this.flushTextBuffer();
		return {
			assistantResponse: this.textParts.join(''),
			model: this.model,
			finishReason: this.finishReason,
			usage: this.usage,
			totalCost: this.totalCost,
			toolCalls: this.toolCalls,
			timeline: this.timeline,
			startTime: this.startTime,
			duration: Date.now() - this.startTime,
			error: this.error,
			workingMemory: this.workingMemory,
		};
	}

	/** Flush accumulated text into a timeline event. */
	private flushTextBuffer(): void {
		if (this.textBuffer.length === 0) return;
		const content = this.textBuffer.join('');
		if (content.trim()) {
			this.timeline.push({ type: 'text', content, timestamp: Date.now() });
		}
		this.textBuffer = [];
	}

	/**
	 * Record a discrete `tool-call` chunk from the stream. Maintains both the
	 * flat `toolCalls` array (backward compat) and the ordered timeline. The
	 * matching `tool-result` chunk closes the timeline entry.
	 */
	private recordToolCall(toolCallId: string, name: string, input: unknown): void {
		this.flushTextBuffer();

		this.toolCalls.push({ name, input, output: undefined });

		const entry = this.registry.get(name);
		this.timeline.push({
			type: 'tool-call',
			kind: entry?.kind ?? 'tool',
			name,
			toolCallId,
			input,
			output: undefined as unknown,
			startTime: Date.now(),
			endTime: 0,
			success: false,
			workflowId: entry?.workflowId,
			workflowName: entry?.workflowName,
			triggerType: entry?.triggerType,
		});
	}

	/**
	 * Record a discrete `tool-result` chunk from the stream. Closes the
	 * matching open timeline entry by `toolCallId` (preferred) or by name as
	 * a fallback.
	 */
	private recordToolResult(
		toolCallId: string,
		name: string,
		output: unknown,
		isError: boolean,
	): void {
		const pendingFlat = [...this.toolCalls]
			.reverse()
			.find((tc) => tc.name === name && tc.output === undefined);
		if (pendingFlat) {
			pendingFlat.output = output;
		} else {
			this.toolCalls.push({ name, input: undefined, output });
		}

		const pendingTimeline = [...this.timeline]
			.reverse()
			.find(
				(e): e is TimelineEvent & { type: 'tool-call' } =>
					e.type === 'tool-call' &&
					(toolCallId ? e.toolCallId === toolCallId : e.name === name) &&
					e.endTime === 0,
			);
		if (pendingTimeline) {
			pendingTimeline.output = output;
			pendingTimeline.endTime = Date.now();
			pendingTimeline.success = !isError;

			if (pendingTimeline.kind === 'workflow' && isRecord(output)) {
				const execId = output.executionId;
				if (typeof execId === 'string') {
					pendingTimeline.workflowExecutionId = execId;
				}
			}
		}
	}
}
