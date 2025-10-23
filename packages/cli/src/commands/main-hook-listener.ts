import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import type { ChildProcess } from 'child_process';

import { getLifecycleHooksForRegularMain } from '@/execution-lifecycle/execution-lifecycle-hooks';

import type { HookMessage } from './worker-types';

/**
 * Listens to hook events from child process via IPC and invokes real lifecycle hooks with DB access.
 * Used in main thread to handle persistence while child process executes workflow.
 */
export class MainHookListener {
	private readonly hooks: ExecutionLifecycleHooks;

	constructor(
		private readonly child: ChildProcess,
		data: IWorkflowExecutionDataProcess,
		executionId: string,
	) {
		// Create real hooks with DB access
		this.hooks = getLifecycleHooksForRegularMain(data, executionId);

		// Listen to child process for hook events
		this.child.on('message', (msg: HookMessage) => {
			if (msg.type === 'hook') {
				void this.handleHookEvent(msg.hookName, msg.params);
			}
		});
	}

	/**
	 * Clean up when done
	 */
	close(): void {
		// No need to close child process, it will exit on its own
	}

	/**
	 * Handle a hook event from worker thread by invoking the real hook handlers
	 */
	private async handleHookEvent(hookName: string, params: unknown[]): Promise<void> {
		try {
			// Get the handlers for this hook
			const handlers = this.hooks.handlers[hookName as keyof typeof this.hooks.handlers];

			if (!handlers || handlers.length === 0) {
				return;
			}

			// Reconstruct parameters based on hook type
			const reconstructedParams = this.reconstructParameters(hookName, params);

			// Execute all handlers for this hook
			for (const handler of handlers) {
				await (handler as Function).apply(this.hooks, reconstructedParams);
			}
		} catch (error) {
			console.error(`Error handling hook '${hookName}':`, error);
			throw error;
		}
	}

	/**
	 * Reconstruct hook parameters from serialized data
	 */
	private reconstructParameters(hookName: string, params: unknown[]): unknown[] {
		switch (hookName) {
			case 'workflowExecuteBefore':
				// parameters were: [workflow: Workflow, data?: IRunExecutionData]
				// We sent: [undefined, data]
				// We need to reconstruct with actual workflow instance - but hooks don't actually use it
				// The hook context has this.workflowData which is what they use
				return params;

			case 'workflowExecuteAfter':
			case 'nodeExecuteBefore':
			case 'nodeExecuteAfter':
				// These are already serializable, pass through
				return params;

			default:
				return params;
		}
	}
}
