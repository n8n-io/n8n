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

export type Callbacks = {
	nodeExecuteBefore: Array<(this: ExecutionLifecycleHooks, nodeName: string) => Promise<void>>;

	nodeExecuteAfter: Array<
		(
			this: ExecutionLifecycleHooks,
			nodeName: string,
			data: ITaskData,
			executionData: IRunExecutionData,
		) => Promise<void>
	>;

	workflowExecuteBefore: Array<
		(this: ExecutionLifecycleHooks, workflow?: Workflow, data?: IRunExecutionData) => Promise<void>
	>;

	workflowExecuteAfter: Array<
		(this: ExecutionLifecycleHooks, data: IRun, newStaticData: IDataObject) => Promise<void>
	>;

	/** Used by trigger and webhook nodes to respond back to the request */
	sendResponse: Array<
		(this: ExecutionLifecycleHooks, response: IExecuteResponsePromiseData) => Promise<void>
	>;

	/** Executed after a node fetches data */
	nodeFetchedData: Array<
		(this: ExecutionLifecycleHooks, workflowId: string, node: INode) => Promise<void>
	>;
};

export type ExecutionLifecycleHookName = keyof Callbacks;

export interface ExecutionHooksOptionalParameters {
	retryOf?: string;
	pushRef?: string;
}

/**
 * Contains hooks that trigger at specific events in an execution's lifecycle. Every hook has an array of callbacks to run.
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
 * const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
 * hooks.add('workflowExecuteAfter, async function(fullRunData) {
 *  await saveToDatabase(executionId, fullRunData);
 *});
 * ```
 */
export class ExecutionLifecycleHooks {
	/** Session ID of the client that started the execution. */
	pushRef?: string;

	/** Execution ID of a precious execution, if this is a retry of that execution. */
	retryOf?: string;

	private readonly callbacks: Callbacks = {
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

	addCallback<Hook extends keyof Callbacks>(
		hookName: Hook,
		...hookFunctions: Array<Callbacks[Hook][number]>
	): void {
		// @ts-expect-error FIX THIS
		this.callbacks[hookName].push(...hookFunctions);
	}

	async runHook<
		Hook extends keyof Callbacks,
		Params extends unknown[] = Parameters<Exclude<Callbacks[Hook], undefined>[number]>,
	>(hookName: Hook, parameters: Params) {
		const hooks = this.callbacks[hookName];
		for (const hookFunction of hooks) {
			const typedHookFunction = hookFunction as unknown as (
				this: ExecutionLifecycleHooks,
				...args: Params
			) => Promise<void>;
			await typedHookFunction.apply(this, parameters);
		}
	}
}
