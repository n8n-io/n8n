import { ToolMessage } from '@langchain/core/messages';
import type { ToolRunnableConfig } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';

import type { ToolError } from './progress';
import type { WorkflowState } from '../../workflow-state';

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
