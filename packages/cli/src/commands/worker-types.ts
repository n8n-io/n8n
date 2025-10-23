import type { IRun, IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';
import type { MessagePort } from 'worker_threads';

/**
 * Task data sent to Piscina worker for workflow execution
 */
export interface PiscinaExecutionTask {
	workflow: IWorkflowBase;
	executionId: string;
	executionMode: WorkflowExecuteMode;
	executionData: IRunExecutionData;
	/** MessagePort for sending lifecycle hook events back to main thread */
	hookPort: MessagePort;
}

/**
 * Result returned from Piscina worker after workflow execution
 */
export interface PiscinaExecutionResult {
	run: IRun;
	/** Worker thread memory usage in bytes */
	memoryUsage?: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	};
}

/**
 * Hook event message sent from worker to main thread via MessageChannel
 */
export interface HookMessage {
	type: 'hook';
	hookName: string;
	executionId: string;
	params: unknown[];
}

// Legacy types - kept for backwards compatibility during migration
export type WorkerMessage =
	| { type: 'ping' }
	| {
			type: 'execute';
			workflow: IWorkflowBase;
			executionId: string;
			executionMode: WorkflowExecuteMode;
			executionData: IRunExecutionData;
	  };

export type MainMessage = { type: 'pong' } | { type: 'done'; run: IRun } | HookMessage;
