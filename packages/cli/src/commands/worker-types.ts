import type { IRun, IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

/**
 * Task data sent to child process for workflow execution
 */
export interface ChildProcessExecutionTask {
	workflow: IWorkflowBase;
	executionId: string;
	executionMode: WorkflowExecuteMode;
	executionData: IRunExecutionData;
}

/**
 * Result returned from child process after workflow execution
 */
export interface ChildProcessExecutionResult {
	run: IRun;
}

// Legacy Piscina types - kept for backwards compatibility
export interface PiscinaExecutionTask extends ChildProcessExecutionTask {}
export interface PiscinaExecutionResult extends ChildProcessExecutionResult {}

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

/**
 * Messages sent from child process to main thread
 */
export interface DoneMessage {
	type: 'done';
	executionId: string;
	run: IRun;
	/** Child process memory usage in bytes */
	memoryUsage?: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	};
}

export type MainMessage = { type: 'pong' } | DoneMessage | HookMessage;
