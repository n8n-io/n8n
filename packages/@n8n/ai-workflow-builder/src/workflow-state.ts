import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { IRunExecutionData, INode, IConnections } from 'n8n-workflow';

import type { SimpleWorkflow } from './types';

/**
 * Workflow operation types that can be applied to the workflow state
 */
export type WorkflowOperation =
	| { type: 'clear' }
	| { type: 'removeNodes'; nodeIds: string[] }
	| { type: 'addNodes'; nodes: INode[] }
	| { type: 'updateNode'; nodeId: string; updates: Partial<INode> }
	| { type: 'setConnections'; connections: IConnections }
	| { type: 'mergeConnections'; connections: IConnections };

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
	// The original prompt from the user.
	prompt: Annotation<string>({ reducer: (x, y) => y ?? x ?? '' }),
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
	isWorkflowPrompt: Annotation<boolean>({ reducer: (x, y) => y ?? x ?? false }),
	// The execution data from the last workflow run.
	executionData: Annotation<IRunExecutionData['resultData'] | undefined>({
		reducer: (x, y) => (y === undefined ? undefined : (y ?? x ?? undefined)),
	}),
});

/**
 * Type for partial state updates
 */
export type WorkflowStatePartialUpdate = Partial<typeof WorkflowState.State>;
