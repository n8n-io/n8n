import type { StreamChunk } from '@n8n/agents';

export interface RecordedUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
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
	startTime: number;
	duration: number;
	error: string | null;
}

export class ExecutionRecorder {
	private textParts: string[] = [];

	private model: string | null = null;

	private finishReason = 'unknown';

	private usage: RecordedUsage | null = null;

	private totalCost: number | null = null;

	private error: string | null = null;

	private readonly startTime = Date.now();

	/** Feed a stream chunk into the recorder. */
	record(chunk: StreamChunk): void {
		switch (chunk.type) {
			case 'text-delta':
				this.textParts.push(chunk.delta);
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
				this.totalCost = chunk.totalCost ?? null;
				break;
			case 'error': {
				const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
				this.error = errMsg;
				break;
			}
			// Other chunk types (reasoning-delta, message, tool-call-delta, tool-call-suspended)
			// are not captured in the execution record for now.
		}
	}

	/** Build the final message record after the stream has ended. */
	getMessageRecord(): MessageRecord {
		return {
			assistantResponse: this.textParts.join(''),
			model: this.model,
			finishReason: this.finishReason,
			usage: this.usage,
			totalCost: this.totalCost,
			startTime: this.startTime,
			duration: Date.now() - this.startTime,
			error: this.error,
		};
	}
}
