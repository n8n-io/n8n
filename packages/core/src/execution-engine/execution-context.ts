import {
	type IWorkflowExecuteAdditionalData,
	type WorkflowExecuteMode,
	type IRunExecutionData,
	type Workflow,
} from 'n8n-workflow';

import { assertExecutionDataExists } from '@/utils/assertions';

/**
 * Establishes the execution context for a workflow run.
 *
 * This function creates or inherits the execution context that persists throughout the workflow
 * execution lifecycle. The context is stored in `runExecutionData.executionData.runtimeData`.
 *
 * @param workflow - The workflow instance being executed (reserved for future context extraction)
 * @param runExecutionData - The execution data structure that will be mutated to include the execution context
 * @param additionalData - Additional workflow execution data used for validation and future context extraction
 * @param mode - The workflow execution mode (manual, trigger, webhook, error, etc.)
 *
 * @returns Promise that resolves when context has been established
 *
 * @throws {UnexpectedError} When `runExecutionData.executionData` is missing or invalid
 *
 * @remarks
 * ## Context Establishment Strategy
 *
 * The function follows a priority-based approach to establish execution context:
 *
 * ### 1. Preserve Existing Context (Webhook Resume)
 * If `executionData.runtimeData` already exists, the function returns immediately without
 * modification. This preserves context when workflows resume from database (e.g., after
 * waiting for a webhook or manual continuation).
 *
 * ### 2. Inherit from Parent Execution (Sub-workflows)
 * If `runExecutionData.parentExecution` exists, creates a new context by inheriting all
 * fields from the parent context while generating fresh values for:
 * - `establishedAt`: Set to current timestamp
 * - `source`: Set to current execution mode
 * - `parentExecutionId`: Tracks the parent execution ID
 *
 * This applies to sub-workflows invoked via "Execute Workflow" node.
 *
 * ### 3. Inherit from Start Node Metadata (Error Workflows)
 * If `startItem.metadata.parentExecution.executionContext` exists, creates a new context
 * by inheriting from the parent context. This applies to error workflows that need to
 * preserve the original workflow's context.
 *
 * ### 4. Create Fresh Context (New Executions)
 * For new root executions, creates a fresh context with:
 * - `version`: 1
 * - `establishedAt`: Current timestamp
 * - `source`: Current execution mode
 *
 * ## Mutation Behavior
 * This function mutates `runExecutionData.executionData.runtimeData` with the execution context.
 *
 * ## Context Inheritance Pattern
 * When inheriting context, the strategy is:
 * 1. Spread all parent context fields (credentials, custom fields, etc.)
 * 2. Override `establishedAt` with current timestamp
 * 3. Override `source` with current execution mode
 * 4. Add `parentExecutionId` to track lineage
 *
 * This ensures child executions reflect their own timing and mode while preserving
 * contextual information like credentials and authentication state.
 *
 * ## Special Cases
 *
 * ### Chat Trigger Workflows
 * Workflows containing only Chat Trigger nodes have an empty `nodeExecutionStack`.
 * Basic context is still established with version and timestamp.
 *
 * ### Empty Execution Stack
 * If no start item exists and no parent context is available, establishes minimal
 * context (version, timestamp, source) without additional enrichment.
 *
 * ## Future Enhancements
 * The function is designed to support extracting context information from:
 * - Start node parameters (e.g., webhook authentication tokens)
 * - Start node type (trigger, manual, webhook, etc.)
 * - Input data from triggering events
 * - User identification from various sources
 *
 * ## Example Usage
 * ```typescript
 * // New execution
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');
 * // Context: { version: 1, establishedAt: 1234567890, source: 'manual' }
 *
 * // Sub-workflow execution (with parent context)
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'trigger');
 * // Context: { ...parentContext, establishedAt: 9876543210, source: 'trigger', parentExecutionId: 'parent-id' }
 *
 * // Resumed execution (webhook wait completed)
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');
 * // Context: <preserved from original execution>
 * ```
 *
 * @see IExecutionContextV1 for context structure definition
 * @see IRunExecutionData for execution data structure
 * @see IWorkflowExecuteAdditionalData for additional execution data
 * @see RelatedExecution for parent execution context propagation
 */
export const establishExecutionContext = async (
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
): Promise<void> => {
	assertExecutionDataExists(runExecutionData.executionData, workflow, additionalData, mode);

	const executionData = runExecutionData.executionData;

	if (executionData.runtimeData) {
		// Context is already established, no further action needed.
		// This can happen, when a workflow is resumed from the database.
		return;
	}

	// At this point we have established the basic execution context.
	// If a context is already established we overwrite it.
	// This might change depending on the propagation strategy we want to implement in the future.
	executionData.runtimeData = {
		version: 1,
		establishedAt: Date.now(),
		source: mode,
	};

	if (runExecutionData.parentExecution) {
		// Create a new context by inheriting everything from the parent execution context,
		// except for the establishedAt timestamp which we set to now and the source which we set to the current mode.
		// This ensures that the child execution context reflects the time it was established
		// and the mode in which it is running, while still retaining all other contextual information
		// from the parent execution.
		executionData.runtimeData = {
			...(runExecutionData.parentExecution.executionContext ?? {}),
			...executionData.runtimeData,
			parentExecutionId: runExecutionData.parentExecution.executionId,
		};
		return;
	}

	// Next, we attempt to extract additional context from the start node of the execution stack.
	const [startItem] = executionData.nodeExecutionStack;

	// The nodeExecutionStack is typically initialized in one of three ways:
	// 1. run() method: Creates stack with start node (workflow-execute.ts:143-157)
	// 2. runPartialWorkflow2(): Recreates stack from existing runData via recreateNodeExecutionStack()
	// 3. Constructor with executionData: Pre-populated from caller (resume scenarios)
	//
	// However, the stack CAN be legitimately empty for workflows containing only Chat Trigger nodes
	// (see workflow-execute.ts:1368-1369). In such cases, we cannot extract context from a start
	// node, but we should still establish basic execution context.
	//
	// We cannot extract user specific information from the initial item though. So we exit early.
	if (!startItem) {
		return;
	}

	// We were triggered from a parent execution
	// and can inherit context from there
	if (startItem.metadata?.parentExecution?.executionContext) {
		executionData.runtimeData = {
			...startItem.metadata.parentExecution.executionContext,
			...executionData.runtimeData,
			parentExecutionId: startItem.metadata.parentExecution.executionId,
		};
		return;
	}

	// TODO: the following comments will be implemented in future iterations
	// to extract more context information based on the start node
	// and the data that triggered the workflow execution.
	// the comments are left here for now to provide more context on how
	// this can be achieved.

	// startNodeParameters will hold the parameters of the start node
	// this can be the settings for the different hooks to be executed
	// for example to extract the bearer token from the start node data.

	// const startNodeParameters = startItem.node.parameters;

	// startNodeType holds the type of the start node

	// const startNodeType = startItem.node.type;

	// Main input data is an array of items, each item represents an event that triggers the workflow execution
	// The 'main' selector selects the input name of the nodes, and the 0 index represents the runIndex,
	// 0 being the first run of this node in the workflow.

	// const mainInput = startItem.data["main"][0];

	// based on startNodeParameters, startNodeType and mainInput we can now
	// iterate over the different hooks to extract specific data for the runtime context
};
