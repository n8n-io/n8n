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
 * This function creates and initializes the execution context that persists throughout
 * the workflow execution lifecycle. The context is stored directly in the provided
 * `runExecutionData.executionData.runtimeData` object.
 *
 * @param workflow - The workflow instance being executed (reserved for future context extraction)
 * @param runExecutionData - The execution data structure that will be mutated to include the execution context
 * @param additionalData - Additional workflow execution data used for validation and future context extraction
 * @param mode - The workflow execution mode (manual, trigger, webhook, etc.)
 *
 * @returns Promise that resolves when context has been established
 *
 * @throws {UnexpectedError} When `runExecutionData.executionData` is missing or invalid
 *
 * @remarks
 * ## Mutation Behavior
 * This function mutates the provided `runExecutionData` object by setting:
 * - `runExecutionData.executionData.runtimeData` with the newly created execution context
 *
 * ## Context Creation
 * - Creates a new context with version 1 schema and current timestamp
 * - Establishes basic context for all workflows (including Chat Trigger workflows)
 * - Supports future extraction of context information from start node (when available)
 * - Validates execution data structure before context creation
 *
 * ## Chat Trigger Support
 * Workflows containing only Chat Trigger nodes have an empty `nodeExecutionStack`.
 * In such cases, basic context (version + timestamp) is still established, but no
 * start-node-specific context extraction is performed.
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
 * await establishExecutionContext(workflow, runExecutionData, additionalData, mode);
 * // Context is now available in: runExecutionData.executionData.runtimeData
 * ```
 *
 * @see IExecutionContextV1 for context structure definition
 * @see IRunExecutionData for execution data structure
 * @see IWorkflowExecuteAdditionalData for additional execution data
 */
export const establishExecutionContext = async (
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
): Promise<void> => {
	assertExecutionDataExists(runExecutionData.executionData, workflow, additionalData, mode);

	const executionData = runExecutionData.executionData;

	// At this point we have established the basic execution context.
	// If a context is already established we overwrite it.
	// This might change depending on the propagation strategy we want to implement in the future.
	executionData.runtimeData = {
		version: 1,
		establishedAt: Date.now(),
		source: mode,
	};

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
