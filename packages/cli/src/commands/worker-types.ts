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

export type MainMessage = { type: 'pong' } | { type: 'done'; run: IRun } | HookMessage;
