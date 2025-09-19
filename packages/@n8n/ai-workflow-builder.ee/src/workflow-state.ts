import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
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

// Creates a reducer that trims the message history to keep only the last `maxUserMessages` HumanMessage instances
export function createTrimMessagesReducer(maxUserMessages: number) {
	return (current: BaseMessage[]): BaseMessage[] => {
		// Count HumanMessage instances and remember their indices
		const humanMessageIndices: number[] = [];
		current.forEach((msg, index) => {
			if (msg instanceof HumanMessage) {
				humanMessageIndices.push(index);
			}
		});

		// If we have fewer than or equal to maxUserMessages, return as is
		if (humanMessageIndices.length <= maxUserMessages) {
			return current;
		}

		// Find the index of the first HumanMessage that we want to keep
		const startHumanMessageIndex =
			humanMessageIndices[humanMessageIndices.length - maxUserMessages];

		// Slice from that HumanMessage onwards
		return current.slice(startHumanMessageIndex);
	};
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
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),
	// Operations to apply to the workflow - processed by a separate node
	workflowOperations: Annotation<WorkflowOperation[] | null>({
		reducer: operationsReducer,
		default: () => [],
	}),
	// Latest workflow context
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Previous conversation summary (used for compressing long conversations)
	previousSummary: Annotation<string>({
		reducer: (x, y) => y ?? x, // Overwrite with the latest summary
		default: () => 'EMPTY',
	}),
});
