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

export type ExecutionLifecyleHookHandlers = {
	nodeExecuteBefore: Array<
		(this: ExecutionLifecycleHooks, nodeName: string) => Promise<void> | void
	>;

	nodeExecuteAfter: Array<
		(
			this: ExecutionLifecycleHooks,
			nodeName: string,
			data: ITaskData,
			executionData: IRunExecutionData,
		) => Promise<void> | void
	>;

	workflowExecuteBefore: Array<
		(
			this: ExecutionLifecycleHooks,
			workflow: Workflow,
			data?: IRunExecutionData,
		) => Promise<void> | void
	>;

	workflowExecuteAfter: Array<
		(this: ExecutionLifecycleHooks, data: IRun, newStaticData: IDataObject) => Promise<void> | void
	>;

	/** Used by trigger and webhook nodes to respond back to the request */
	sendResponse: Array<
		(this: ExecutionLifecycleHooks, response: IExecuteResponsePromiseData) => Promise<void> | void
	>;

	/**
	 * Executed after a node fetches data
	 * - For a webhook node, after the node had been run.
   * - For a http-request node, or any other node that makes http requests that still use the deprecated request* methods, after every successful http request
s	 */
	nodeFetchedData: Array<
		(this: ExecutionLifecycleHooks, workflowId: string, node: INode) => Promise<void> | void
	>;
};

export type ExecutionLifecycleHookName = keyof ExecutionLifecyleHookHandlers;

/**
 * Manages and executes hooks for workflow and node execution lifecycle events.
 * These hooks allow external code to perform actions before or after
 * specific points in the execution process.
 *
 * ### Available Hooks
 *
 * - **nodeExecuteBefore**: Triggered before a node is executed
 * - **nodeExecuteAfter**: Triggered after a node is executed
 * - **workflowExecuteBefore**: Triggered before workflow execution starts
 * - **workflowExecuteAfter**: Triggered after workflow execution completes
 *
 * ### These hooks are particularly useful for
 * - Logging and observability
 * - Saving execution progress to database
 * - Pushing execution status updates to the frontend
 * - Recording workflow statistics
 * - Running external hooks for execution events
 * - Error and Cancellation handling and cleanup
 * - Execution analytics
 *
 * @example
 * ```typescript
 * const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
 * hooks.add('workflowExecuteAfter, async function(fullRunData) {
 *  await saveToDatabase(executionId, fullRunData);
 *});
 * ```
 *
 * ### Hook Execution Flow
 *
 * ```mermaid
 * sequenceDiagram
 *     participant WE as WorkflowExecute
 *     participant Hooks as ExecutionLifecycleHooks
 *     participant Handlers as Hook Handlers
 *
 *     WE->>Hooks: workflowExecuteBefore()
 *     Hooks->>Handlers: Call all registered handlers
 *
 *     loop For each node
 *         WE->>Hooks: nodeExecuteBefore(nodeName)
 *         Hooks->>Handlers: Call handlers
 *         WE->>WE: Execute node
 *         WE->>Hooks: nodeExecuteAfter(nodeName, data)
 *         Hooks->>Handlers: Call handlers
 *     end
 *
 *     WE->>Hooks: workflowExecuteAfter()
 *     Hooks->>Handlers: Call all registered handlers
 * ```
 */
export class ExecutionLifecycleHooks {
	readonly handlers: ExecutionLifecyleHookHandlers = {
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
	) {}

	addHandler<Hook extends keyof ExecutionLifecyleHookHandlers>(
		hookName: Hook,
		...handlers: Array<ExecutionLifecyleHookHandlers[Hook][number]>
	): void {
		// @ts-expect-error FIX THIS
		this.handlers[hookName].push(...handlers);
	}

	async runHook<
		Hook extends keyof ExecutionLifecyleHookHandlers,
		Params extends unknown[] = Parameters<
			Exclude<ExecutionLifecyleHookHandlers[Hook], undefined>[number]
		>,
	>(hookName: Hook, parameters: Params) {
		const hooks = this.handlers[hookName];
		for (const hookFunction of hooks) {
			const typedHookFunction = hookFunction as unknown as (
				this: ExecutionLifecycleHooks,
				...args: Params
			) => Promise<void>;
			await typedHookFunction.apply(this, parameters);
		}
	}
}

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		hooks?: ExecutionLifecycleHooks;
	}
}
