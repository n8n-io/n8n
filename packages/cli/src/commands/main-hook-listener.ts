import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import type { MessagePort } from 'worker_threads';

import { getLifecycleHooksForRegularMain } from '@/execution-lifecycle/execution-lifecycle-hooks';

import type { HookMessage } from './worker-types';

/**
 * Listens to hook events from worker thread via MessageChannel and invokes real lifecycle hooks with DB access.
 * Used in main thread to handle persistence while worker executes workflow.
 */
export class MainHookListener {
	private readonly hooks: ExecutionLifecycleHooks;

	constructor(
		private readonly hookPort: MessagePort,
		data: IWorkflowExecutionDataProcess,
		executionId: string,
	) {
		// Create real hooks with DB access
		this.hooks = getLifecycleHooksForRegularMain(data, executionId);

		// Listen to MessagePort for hook events
		this.hookPort.on('message', (msg: HookMessage) => {
			if (msg.type === 'hook') {
				void this.handleHookEvent(msg.hookName, msg.params);
			}
		});
	}

	/**
	 * Clean up the message port when done
	 */
	close(): void {
		this.hookPort.close();
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
