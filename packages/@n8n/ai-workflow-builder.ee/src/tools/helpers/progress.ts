import type { ToolRunnableConfig } from '@langchain/core/tools';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import type {
	ToolProgressMessage,
	ToolError,
	ProgressReporter,
	BatchReporter,
} from '../../types/tools';

/**
 * Create a progress reporter for a tool execution
 *
 * @param config
 * @param toolName
 * @param displayTitle the general tool action name, for example "Searching for nodes"
 * @param customTitle custom title per tool call, for example "Searching for OpenAI"
 */
export function createProgressReporter<TToolName extends string = string>(
	config: ToolRunnableConfig & LangGraphRunnableConfig,
	toolName: TToolName,
	displayTitle: string,
	customTitle?: string,
): ProgressReporter {
	const toolCallId = config.toolCall?.id;

	let customDisplayTitle = customTitle;

	const emit = (message: ToolProgressMessage<TToolName>): void => {
		config.writer?.(message);
	};

	const start = <T>(input: T, options?: { customDisplayTitle: string }): void => {
		if (options?.customDisplayTitle) {
			customDisplayTitle = options.customDisplayTitle;
		}
		emit({
			type: 'tool',
			toolName,
			toolCallId,
			displayTitle,
			customDisplayTitle,
			status: 'running',
			updates: [
				{
					type: 'input',
					data: input as Record<string, unknown>,
				},
			],
		});
	};

	const progress = (message: string, data?: Record<string, unknown>): void => {
		emit({
			type: 'tool',
			toolName,
			toolCallId,
			displayTitle,
			customDisplayTitle,
			status: 'running',
			updates: [
				{
					type: 'progress',
					data: data ?? { message },
				},
			],
		});
	};

	const complete = <T>(output: T): void => {
		emit({
			type: 'tool',
			toolName,
			toolCallId,
			displayTitle,
			customDisplayTitle,
			status: 'completed',
			updates: [
				{
					type: 'output',
					data: output as Record<string, unknown>,
				},
			],
		});
	};

	const error = (error: ToolError): void => {
		emit({
			type: 'tool',
			toolName,
			toolCallId,
			displayTitle,
			customDisplayTitle,
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
	};

	const createBatchReporter = (scope: string): BatchReporter => {
		let currentIndex = 0;
		let totalItems = 0;

		return {
			init: (total: number) => {
				totalItems = total;
				currentIndex = 0;
			},
			next: (itemDescription: string) => {
				currentIndex++;
				progress(`${scope}: Processing item ${currentIndex} of ${totalItems}: ${itemDescription}`);
			},
			complete: () => {
				progress(`${scope}: Completed all ${totalItems} items`);
			},
		};
	};

	return {
		start,
		progress,
		complete,
		error,
		createBatchReporter,
	};
}

/**
 * Helper function to report start of tool execution
 */
export function reportStart<T>(reporter: ProgressReporter, input: T): void {
	reporter.start(input);
}

/**
 * Helper function to report progress during tool execution
 */
export function reportProgress(
	reporter: ProgressReporter,
	message: string,
	data?: Record<string, unknown>,
): void {
	reporter.progress(message, data);
}

/**
 * Helper function to report successful completion
 */
export function reportComplete<T>(reporter: ProgressReporter, output: T): void {
	reporter.complete(output);
}

/**
 * Helper function to report error during execution
 */
export function reportError(reporter: ProgressReporter, error: ToolError): void {
	reporter.error(error);
}

/**
 * Create a batch progress reporter for multi-item operations
 */
export function createBatchProgressReporter(
	reporter: ProgressReporter,
	scope: string,
): BatchReporter {
	return reporter.createBatchReporter(scope);
}
