import { ExecutionLifecycleHooks } from 'n8n-core';
import type {
	IDataObject,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	Workflow,
	WorkflowExecuteMode,
	IWorkflowBase,
} from 'n8n-workflow';
import type { MessagePort } from 'worker_threads';

/**
 * Proxy lifecycle hooks that send hook events to the main thread instead of executing them.
 * Used in worker threads to delegate DB operations to the main thread.
 */
export class WorkerProxyHooks extends ExecutionLifecycleHooks {
	constructor(
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		private readonly parentPort: MessagePort,
	) {
		super(mode, executionId, workflowData);
	}

	/**
	 * Override runHook to send messages to main thread instead of executing handlers
	 */
	override async runHook<Hook extends string, Params extends unknown[]>(
		hookName: Hook,
		parameters: Params,
	): Promise<void> {
		// First run any local handlers (though we don't expect any)
		await super.runHook(hookName as never, parameters as never);

		// Then send the hook event to main thread for DB operations
		this.sendHookToMainThread(hookName, parameters);
	}

	private sendHookToMainThread(hookName: string, parameters: unknown[]): void {
		// Serialize the parameters for sending across thread boundary
		const serializedParams = this.serializeParameters(hookName, parameters);

		this.parentPort.postMessage({
			type: 'hook',
			hookName,
			executionId: this.executionId,
			params: serializedParams,
		});
	}

	/**
	 * Serialize hook parameters to ensure they can be sent across thread boundary
	 */
	private serializeParameters(hookName: string, parameters: unknown[]): unknown[] {
		// Most hook parameters should be serializable already, but we need to handle special cases
		switch (hookName) {
			case 'workflowExecuteBefore':
				// parameters: [workflow: Workflow, data?: IRunExecutionData]
				// Workflow instance is not serializable, but we already have workflowData
				return [undefined, parameters[1]]; // Skip workflow, include data

			case 'workflowExecuteAfter':
				// parameters: [data: IRun, newStaticData: IDataObject]
				return parameters; // Both are serializable

			case 'nodeExecuteBefore':
				// parameters: [nodeName: string, data: ITaskStartedData]
				return parameters; // Both are serializable

			case 'nodeExecuteAfter':
				// parameters: [nodeName: string, data: ITaskData, executionData: IRunExecutionData]
				return parameters; // All are serializable

			default:
				return parameters;
		}
	}
}
