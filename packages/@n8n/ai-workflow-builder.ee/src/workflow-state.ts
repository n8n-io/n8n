import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

import type { SimpleWorkflow, WorkflowMetadata, WorkflowOperation } from './types';
import { appendArrayReducer, cachedTemplatesReducer } from './utils/state-reducers';
import type { ProgrammaticEvaluationResult, TelemetryValidationStatus } from './validation/types';
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
	// Results of last workflow validation
	workflowValidation: Annotation<ProgrammaticEvaluationResult | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),
	// Compacted programmatic validations history for telemetry
	validationHistory: Annotation<TelemetryValidationStatus[]>({
		reducer: (x, y) => (y && y.length > 0 ? [...x, ...y] : x),
		default: () => [],
	}),
	// Technique categories identified from get_best_practices tool for telemetry
	techniqueCategories: Annotation<string[]>({
		reducer: (x, y) => (y && y.length > 0 ? [...x, ...y] : x),
		default: () => [],
	}),

	// Previous conversation summary (used for compressing long conversations)
	previousSummary: Annotation<string>({
		reducer: (x, y) => y ?? x, // Overwrite with the latest summary
		default: () => 'EMPTY',
	}),

	// Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Cached workflow templates from template API
	// Shared across tools to reduce API calls
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),
});
