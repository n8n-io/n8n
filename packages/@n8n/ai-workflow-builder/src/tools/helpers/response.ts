import { ToolMessage } from '@langchain/core/messages';
import { Command, type LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ToolError } from './progress';
import type { SimpleWorkflow } from '../../types';
import type { WorkflowState } from '../../workflow-state';

export type StateUpdater<TState = typeof WorkflowState.State> =
	| Partial<TState>
	| ((state: TState) => Partial<TState>);

/**
 * Create a success response with optional state updates
 */
export function createSuccessResponse<TState = typeof WorkflowState.State>(
	config: LangGraphRunnableConfig,
	message: string,
	stateUpdates?: StateUpdater<TState>,
): Command {
	// @ts-expect-error - toolCall exists but not in types
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const toolCallId = config.toolCall?.id as string;

	const messages = [
		new ToolMessage({
			content: message,
			tool_call_id: toolCallId,
		}),
	];

	const update = { messages };

	if (stateUpdates) {
		if (typeof stateUpdates === 'function') {
			Object.assign(update, stateUpdates);
		} else {
			Object.assign(update, stateUpdates);
		}
	}

	return new Command({ update });
}

/**
 * Create an error response
 */
export function createErrorResponse(config: LangGraphRunnableConfig, error: ToolError): Command {
	// @ts-expect-error - toolCall exists but not in types
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const toolCallId = config.toolCall?.id as string;

	const messages = [
		new ToolMessage({
			content: `Error: ${error.message}`,
			tool_call_id: toolCallId,
		}),
	];

	return new Command({ update: { messages } });
}

/**
 * Create a response with workflow JSON updates
 */
export function createResponseWithWorkflow(
	config: LangGraphRunnableConfig,
	message: string,
	workflowJSON: SimpleWorkflow,
): Command {
	return createSuccessResponse(config, message, { workflowJSON });
}

/**
 * Create a response with both message and state updates
 */
export function createResponseWithState<TState = typeof WorkflowState.State>(
	config: LangGraphRunnableConfig,
	message: string,
	stateUpdates: StateUpdater<TState>,
): Command {
	return createSuccessResponse(config, message, stateUpdates);
}

/**
 * Helper to build state updates for workflow JSON
 */
export function buildWorkflowUpdate(
	workflowJSON: SimpleWorkflow,
): Partial<typeof WorkflowState.State> {
	return { workflowJSON };
}

/**
 * Create a simple success message
 */
export function createSimpleSuccessMessage(operation: string, details?: string): string {
	return details ? `${operation}: ${details}` : `${operation} completed successfully`;
}

/**
 * Create a detailed error message
 */
export function createDetailedErrorMessage(operation: string, error: ToolError): string {
	let message = `${operation} failed: ${error.message}`;
	if (error.code) {
		message += ` (${error.code})`;
	}
	return message;
}
