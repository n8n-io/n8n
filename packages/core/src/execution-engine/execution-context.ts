import {
	ExecutionBaseError,
	type IExecutionContextV1,
	type IRunExecutionData,
	type Workflow,
} from 'n8n-workflow';

export class ExecutionContextEstablishmentError extends ExecutionBaseError {
	constructor(message: string) {
		super(message);
		this.name = 'ExecutionContextEstablishmentError';
	}
}

/**
 * Establishes the execution context for a workflow run.
 *
 * This function creates and initializes the execution context that persists throughout
 * the workflow execution lifecycle. The context is stored directly in the provided
 * `runExecutionData.executionData.runtimeData` object.
 *
 * @param _workflow - The workflow instance being executed (currently unused, reserved for future context extraction)
 * @param runExecutionData - The execution data structure that will be mutated to include the execution context
 *
 * @returns Promise that resolves when context has been established
 *
 * @throws {ExecutionContextEstablishmentError} When `runExecutionData.executionData` is missing
 * @throws {ExecutionContextEstablishmentError} When the node execution stack is empty
 *
 * @remarks
 * ## Mutation Behavior
 * This function mutates the provided `runExecutionData` object by setting:
 * - `runExecutionData.executionData.runtimeData` with the newly created execution context
 *
 * ## Context Creation
 * - Creates a new context with version 1 schema and current timestamp
 * - Supports context propagation from parent workflows (future enhancement)
 * - Validates execution data structure before context creation
 *
 * ## Future Enhancements
 * The function is designed to support extracting context information from:
 * - Start node parameters (e.g., webhook authentication tokens)
 * - Start node type (trigger, manual, webhook, etc.)
 * - Input data from triggering events
 *
 * ## Example Usage
 * ```typescript
 * await establishExecutionContext(workflow, runExecutionData);
 * // Context is now available in: runExecutionData.executionData.runtimeData
 * ```
 *
 * @see IExecutionContextV1 for context structure definition
 * @see IRunExecutionData for execution data structure
 */
export const establishExecutionContext = async (
	_workflow: Workflow,
	runExecutionData: IRunExecutionData,
): Promise<void> => {
	const executionContext: IExecutionContextV1 = {
		version: 1,
		establishedAt: Date.now(),
	};

	if (!runExecutionData.executionData) {
		throw new ExecutionContextEstablishmentError(
			'Execution data is missing, this state is not expected, when the workflow is executed the execution data should be initialized.',
		);
	}

	const executionData = runExecutionData.executionData;

	const [startItem] = executionData.nodeExecutionStack;

	if (!startItem) {
		throw new ExecutionContextEstablishmentError(
			'Empty execution stack on workflow execution, failed to establish execution context',
		);
	}

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

	executionData.runtimeData = executionContext;
};
