import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

import type { SimpleWorkflow, WorkflowOperation } from './types/workflow';
import type { ChatPayload } from './workflow-builder-agent';

/**
 * Reducer for collecting workflow operations from parallel tool executions.
 * This reducer intelligently merges operations, avoiding duplicates and handling special cases.
 */
function operationsReducer(
	current: WorkflowOperation[] | null,
	update: WorkflowOperation[] | null | undefined,
): WorkflowOperation[] {
	if (update === null) {
		return [];
	}

	if (!update || update.length === 0) {
		return current ?? [];
	}

	// For clear operations, we can reset everything
	if (update.some((op) => op.type === 'clear')) {
		return update.filter((op) => op.type === 'clear').slice(-1); // Keep only the last clear
	}

	if (!current && !update) {
		return [];
	}
	// Otherwise, append new operations
	return [...(current ?? []), ...update];
}

export const WorkflowState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),
	// // The original prompt from the user.
	// The JSON representation of the workflow being built.
	// Now a simple field without custom reducer - all updates go through operations
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {} }),
	}),
	// Operations to apply to the workflow - processed by a separate node
	workflowOperations: Annotation<WorkflowOperation[] | null>({
		reducer: operationsReducer,
		default: () => [],
	}),
	// Whether the user prompt is a workflow prompt.
	// Latest workflow context
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),
});
