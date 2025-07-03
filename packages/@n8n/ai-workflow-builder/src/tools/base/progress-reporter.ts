import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ToolError } from './types';

/**
 * Type-safe progress update types
 */
export type ProgressUpdateType = 'input' | 'output' | 'progress' | 'error';

export interface ProgressUpdate<T = any> {
	type: ProgressUpdateType;
	data: T;
	timestamp?: string;
}

export interface ToolProgressMessage<TToolName extends string = string> {
	type: 'tool';
	toolName: TToolName;
	toolCallId?: string;
	status: 'running' | 'completed' | 'error';
	updates: ProgressUpdate[];
}

/**
 * Type-safe progress reporter for workflow builder tools
 * Handles all config.writer calls with consistent patterns
 * @template TToolName - The literal type of the tool name for type safety
 */
export class ProgressReporter<TToolName extends string = string> {
	private readonly toolCallId: string | undefined;

	constructor(
		private readonly config: LangGraphRunnableConfig,
		private readonly toolName: TToolName,
	) {
		// @ts-ignore - toolCall exists but not in types
		this.toolCallId = config.toolCall?.id;
	}

	/**
	 * Reports the start of tool execution with input data
	 * @param input - The input data passed to the tool
	 */
	start<T>(input: T): void {
		this.emit({
			type: 'tool',
			toolName: this.toolName,
			toolCallId: this.toolCallId,
			status: 'running',
			updates: [
				{
					type: 'input',
					data: input,
				},
			],
		});
	}

	/**
	 * Reports progress during tool execution
	 * @param message - Progress message to display
	 * @param data - Optional additional data
	 */
	progress(message: string, data?: any): void {
		this.emit({
			type: 'tool',
			toolName: this.toolName,
			toolCallId: this.toolCallId,
			status: 'running',
			updates: [
				{
					type: 'progress',
					data: data ?? message,
				},
			],
		});
	}

	/**
	 * Reports successful completion with output data
	 * @param output - The output data from successful execution
	 */
	complete<T>(output: T): void {
		this.emit({
			type: 'tool',
			toolName: this.toolName,
			toolCallId: this.toolCallId,
			status: 'completed',
			updates: [
				{
					type: 'output',
					data: output,
				},
			],
		});
	}

	/**
	 * Reports error during tool execution
	 * @param error - The error that occurred
	 */
	error(error: ToolError): void {
		this.emit({
			type: 'tool',
			toolName: this.toolName,
			toolCallId: this.toolCallId,
			status: 'error',
			updates: [
				{
					type: 'error',
					data: {
						message: error.message,
						code: error.code,
						details: error.details,
					},
				},
			],
		});
	}

	/**
	 * Emits a progress message if config.writer is available
	 * @param message - The message to emit
	 */
	private emit(message: ToolProgressMessage<TToolName>): void {
		this.config.writer?.(message);
	}

	/**
	 * Creates a scoped reporter for batch operations
	 * @param scope - The scope identifier
	 * @returns A function to report progress for items in the batch
	 */
	createBatchReporter(scope: string) {
		let currentIndex = 0;
		let totalItems = 0;

		return {
			/**
			 * Initialize the batch with total count
			 */
			init: (total: number) => {
				totalItems = total;
				currentIndex = 0;
			},

			/**
			 * Report progress for the next item
			 */
			next: (itemDescription: string) => {
				currentIndex++;
				this.progress(
					`${scope}: Processing item ${currentIndex} of ${totalItems}: ${itemDescription}`,
				);
			},

			/**
			 * Report completion of the batch
			 */
			complete: () => {
				this.progress(`${scope}: Completed all ${totalItems} items`);
			},
		};
	}
}
