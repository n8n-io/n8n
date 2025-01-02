import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/** This defines the types of hooks that can be executed at different stages of a workflow execution. */
export interface RegisteredHooks {
	/** Executed before a node starts executing */
	nodeExecuteBefore: Array<(this: ExecutionHooks, nodeName: string) => Promise<void>>;

	/** Executed after a node finishes executing */
	nodeExecuteAfter: Array<
		(
			this: ExecutionHooks,
			nodeName: string,
			data: ITaskData,
			executionData: IRunExecutionData,
		) => Promise<void>
	>;

	/** Executed before workflow execution starts */
	workflowExecuteBefore: Array<
		(this: ExecutionHooks, workflow?: Workflow, data?: IRunExecutionData) => Promise<void>
	>;

	/** Executed after workflow execution completes */
	workflowExecuteAfter: Array<
		(this: ExecutionHooks, data: IRun, newStaticData: IDataObject) => Promise<void>
	>;

	/** Used by trigger and webhook nodes to respond back to the request */
	sendResponse: Array<
		(this: ExecutionHooks, response: IExecuteResponsePromiseData) => Promise<void>
	>;

	/** Executed when a node fetches data */
	nodeFetchedData: Array<(this: ExecutionHooks, workflowId: string, node: INode) => Promise<void>>;
}

export type ExecutionHookName = keyof RegisteredHooks;

export interface ExecutionHooksOptionalParameters {
	retryOf?: string;
	pushRef?: string;
}

/**
 * This class serves as a container for execution lifecycle hooks that get triggered during different stages of an execution.
 * It manages and executes callback functions registered for specific execution events.
 *
 * Common use cases include:
 * - Saving execution progress to database
 * - Pushing execution status updates to the frontend UI
 * - Recording workflow statistics
 * - Running external hooks for execution events
 * - Error and Cancellation handling and cleanup
 *
 * Example usage:
 * ```typescript
 * const hooks = new ExecutionHooks(mode, executionId, workflowData);
 * hooks.add('workflowExecuteAfter, async function(fullRunData) {
 *  await saveToDatabase(this.executionId, fullRunData);
 *});
 * ```
 */
export class ExecutionHooks {
	pushRef?: string;

	retryOf?: string;

	private readonly registered: RegisteredHooks = {
		nodeExecuteAfter: [],
		nodeExecuteBefore: [],
		nodeFetchedData: [],
		sendResponse: [],
		workflowExecuteAfter: [],
		workflowExecuteBefore: [],
	};

	constructor(
		readonly mode: WorkflowExecuteMode,
		readonly executionId: string,
		readonly workflowData: IWorkflowBase,
		optionalParameters: ExecutionHooksOptionalParameters = {},
	) {
		this.pushRef = optionalParameters.pushRef;
		// retryOf might be `null` from TypeORM
		this.retryOf = optionalParameters.retryOf ?? undefined;
	}

	async executeHook<
		Hook extends keyof RegisteredHooks,
		Params extends unknown[] = Parameters<Exclude<RegisteredHooks[Hook], undefined>[number]>,
	>(hookName: Hook, parameters: Params) {
		const hooks = this.registered[hookName];
		for (const hookFunction of hooks) {
			const typedHookFunction = hookFunction as unknown as (
				this: ExecutionHooks,
				...args: Params
			) => Promise<void>;
			await typedHookFunction.apply(this, parameters);
		}
	}

	addHook<Hook extends keyof RegisteredHooks>(
		hookName: Hook,
		...hookFunctions: Array<RegisteredHooks[Hook][number]>
	): void {
		// @ts-expect-error FIX THIS
		this.registered[hookName].push(...hookFunctions);
	}
}
