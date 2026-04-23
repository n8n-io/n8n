import type { AgentMessage, StreamChunk } from '@n8n/agents';

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
			name: string;
			toolCallId: string;
			input: unknown;
			output: unknown;
			startTime: number;
			endTime: number;
			success: boolean;
	  }
	| { type: 'working-memory'; content: string; timestamp: number }
	| { type: 'suspension'; toolName: string; toolCallId: string; timestamp: number };

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
			case 'message':
				this.processMessage(chunk.message);
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
	 * Process a message chunk containing tool-call or tool-result content parts.
	 * Maintains both the flat toolCalls array (backward compat) and the ordered timeline.
	 */
	private processMessage(message: AgentMessage): void {
		if (!('content' in message) || !Array.isArray(message.content)) return;

		for (const part of message.content) {
			if (part.type === 'tool-call' && 'toolName' in part) {
				this.flushTextBuffer();

				const name = part.toolName;
				const input = 'input' in part ? part.input : undefined;
				const toolCallId = 'toolCallId' in part ? String(part.toolCallId) : '';

				// Flat array (backward compat)
				this.toolCalls.push({ name, input, output: undefined });

				// Timeline event — success is set to false until a tool-result confirms completion
				this.timeline.push({
					type: 'tool-call',
					name,
					toolCallId,
					input,
					output: undefined as unknown,
					startTime: Date.now(),
					endTime: 0,
					success: false,
				});
			} else if (part.type === 'tool-result' && 'toolName' in part) {
				const name = part.toolName;
				const output = 'result' in part ? part.result : undefined;
				const toolCallId = 'toolCallId' in part ? String(part.toolCallId) : '';

				// Flat array (backward compat)
				const pendingFlat = [...this.toolCalls]
					.reverse()
					.find((tc) => tc.name === name && tc.output === undefined);
				if (pendingFlat) {
					pendingFlat.output = output;
				} else {
					this.toolCalls.push({ name, input: undefined, output });
				}

				// Timeline — match by toolCallId first, then by name
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
					pendingTimeline.success = true;
				}
			}
		}
	}
}
