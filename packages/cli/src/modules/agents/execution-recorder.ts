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
	startTime: number;
	duration: number;
	error: string | null;
	workingMemory: string | null;
}

export class ExecutionRecorder {
	private textParts: string[] = [];

	private model: string | null = null;

	private finishReason = 'unknown';

	private usage: RecordedUsage | null = null;

	private totalCost: number | null = null;

	private toolCalls: RecordedToolCall[] = [];

	private _suspended = false;

	private error: string | null = null;

	private workingMemory: string | null = null;

	private readonly startTime = Date.now();

	/** Feed a stream chunk into the recorder. */
	record(chunk: StreamChunk): void {
		switch (chunk.type) {
			case 'text-delta':
				this.textParts.push(chunk.delta);
				break;
			case 'message':
				this.extractToolCalls(chunk.message as AgentMessage);
				break;
			case 'finish':
				this.finishReason = chunk.finishReason;
				if (chunk.usage) {
					this.usage = {
						promptTokens: chunk.usage.promptTokens,
						completionTokens: chunk.usage.completionTokens,
						totalTokens: chunk.usage.totalTokens,
					};
				}
				this.model = chunk.model ?? null;
				// Cost lives in usage.cost for single-agent runs, totalCost only for sub-agent scenarios
				this.totalCost = chunk.totalCost ?? chunk.usage?.cost ?? null;
				break;
			case 'tool-call-suspended':
				this._suspended = true;
				break;
			case 'working-memory-update':
				this.workingMemory = chunk.content;
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
		return {
			assistantResponse: this.textParts.join(''),
			model: this.model,
			finishReason: this.finishReason,
			usage: this.usage,
			totalCost: this.totalCost,
			toolCalls: this.toolCalls,
			startTime: this.startTime,
			duration: Date.now() - this.startTime,
			error: this.error,
			workingMemory: this.workingMemory,
		};
	}

	/**
	 * Extract tool-call and tool-result content parts from agent messages.
	 * Pairs them by toolName into RecordedToolCall entries.
	 */
	private extractToolCalls(message: AgentMessage): void {
		if (!('content' in message) || !Array.isArray(message.content)) return;

		for (const part of message.content) {
			if (part.type === 'tool-call' && 'toolName' in part) {
				this.toolCalls.push({
					name: part.toolName as string,
					input: 'input' in part ? part.input : undefined,
					output: undefined,
				});
			} else if (part.type === 'tool-result' && 'toolName' in part) {
				// Match to the last tool call with the same name that has no output yet
				const pending = [...this.toolCalls]
					.reverse()
					.find((tc) => tc.name === (part.toolName as string) && tc.output === undefined);
				if (pending) {
					pending.output = 'result' in part ? part.result : undefined;
				} else {
					this.toolCalls.push({
						name: part.toolName as string,
						input: undefined,
						output: 'result' in part ? part.result : undefined,
					});
				}
			}
		}
	}
}
