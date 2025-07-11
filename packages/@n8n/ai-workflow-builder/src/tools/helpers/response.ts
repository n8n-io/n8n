import { ToolMessage } from '@langchain/core/messages';
import type { ToolRunnableConfig } from '@langchain/core/tools';
import { Command, type LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ToolError } from './progress';
import type { SimpleWorkflow } from '../../types';
import type { WorkflowState, WorkflowOperation } from '../../workflow-state';

export type StateUpdater<TState = typeof WorkflowState.State> =
	| Partial<TState>
	| ((state: TState) => Partial<TState>);

/**
 * Create a success response with optional state updates
 */
export function createSuccessResponse<TState = typeof WorkflowState.State>(
	config: ToolRunnableConfig,
	message: string,
	stateUpdates?: StateUpdater<TState>,
): Command {
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
export function createErrorResponse(config: ToolRunnableConfig, error: ToolError): Command {
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
 * @deprecated Use operations-based updates instead
 */
export function createResponseWithWorkflow(
	config: LangGraphRunnableConfig,
	message: string,
	workflowJSON: SimpleWorkflow,
): Command {
	// Convert to operations-based update
	const operations: WorkflowOperation[] = [
		{ type: 'clear' },
		{ type: 'addNodes', nodes: workflowJSON.nodes },
		{ type: 'setConnections', connections: workflowJSON.connections },
	];
	return createSuccessResponse(config, message, { workflowOperations: operations });
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
 * @deprecated Use operations-based updates instead
 */
export function buildWorkflowUpdate(
	workflowJSON: SimpleWorkflow,
): Partial<typeof WorkflowState.State> {
	// Convert to operations-based update
	const operations: WorkflowOperation[] = [
		{ type: 'clear' },
		{ type: 'addNodes', nodes: workflowJSON.nodes },
		{ type: 'setConnections', connections: workflowJSON.connections },
	];
	return { workflowOperations: operations };
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
