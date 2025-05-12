import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export type ExecutionLifecyleHookHandlers = {
	nodeExecuteBefore: Array<
		(
			this: ExecutionLifecycleHooks,
			nodeName: string,
			data: ITaskStartedData,
		) => Promise<void> | void
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
 * Contains hooks that trigger at specific events in an execution's lifecycle. Every hook has an array of callbacks to run.
 *
 * Common use cases include:
 * - Saving execution progress to database
 * - Pushing execution status updates to the frontend
 * - Recording workflow statistics
 * - Running external hooks for execution events
 * - Error and Cancellation handling and cleanup
 *
 * @example
 * ```typescript
 * const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
 * hooks.add('workflowExecuteAfter, async function(fullRunData) {
 *  await saveToDatabase(executionId, fullRunData);
 *});
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
